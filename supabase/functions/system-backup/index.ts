import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tables to backup (excluding system tables)
const BACKUP_TABLES = [
  'boxes',
  'box_documents',
  'box_history',
  'box_maintenances',
  'responsaveis',
  'responsavel_documents',
  'responsavel_history',
  'notificacoes',
  'pads',
  'pad_documents',
  'pad_etapas',
  'segmentos',
  'setores',
  'inventory_items',
  'inventory_entries',
  'inventory_exits',
  'moc_produtos',
  'moc_registros',
  'reunioes',
  'reuniao_presencas',
  'configuracoes_administrativas',
  'ufms_historico',
  'whatsapp_templates',
  'whatsapp_config',
  'profiles',
  'user_roles',
  'role_permissions',
  'user_permissions',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin master
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'administrador_master') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administrador master pode realizar backups.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, backupId } = await req.json()

    if (action === 'create') {
      // Create backup record
      const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`
      
      const { data: backupRecord, error: insertError } = await supabase
        .from('system_backups')
        .insert({
          nome: backupName,
          descricao: 'Backup automático do sistema',
          status: 'em_progresso',
          created_by: user.id,
          tabelas_incluidas: BACKUP_TABLES,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating backup record:', insertError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar registro de backup' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Collect all table data
      const backupData: Record<string, unknown[]> = {}
      let totalRegistros = 0

      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
        
        if (error) {
          console.error(`Error backing up table ${table}:`, error)
          continue
        }
        
        backupData[table] = data || []
        totalRegistros += (data || []).length
      }

      // Create backup JSON
      const backupJson = JSON.stringify({
        metadata: {
          created_at: new Date().toISOString(),
          created_by: user.email,
          tables: BACKUP_TABLES,
          total_records: totalRegistros,
        },
        data: backupData,
      }, null, 2)

      // Upload to storage
      const fileName = `${backupName}.json`
      const { error: uploadError } = await supabase.storage
        .from('system-backups')
        .upload(fileName, backupJson, {
          contentType: 'application/json',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading backup:', uploadError)
        await supabase
          .from('system_backups')
          .update({ status: 'erro' })
          .eq('id', backupRecord.id)
        
        return new Response(
          JSON.stringify({ error: 'Erro ao fazer upload do backup' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update backup record
      const { data: signedUrl } = await supabase.storage
        .from('system-backups')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

      await supabase
        .from('system_backups')
        .update({
          status: 'concluido',
          arquivo_url: signedUrl?.signedUrl,
          tamanho_bytes: new Blob([backupJson]).size,
          total_registros: totalRegistros,
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupRecord.id)

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'BACKUP_CREATED',
        table_name: 'system_backups',
        record_id: backupRecord.id,
        new_values: { nome: backupName, total_registros: totalRegistros },
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Backup criado com sucesso',
          backup_id: backupRecord.id,
          total_registros: totalRegistros,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'restore') {
      if (!backupId) {
        return new Response(
          JSON.stringify({ error: 'ID do backup não informado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get backup record
      const { data: backup, error: backupError } = await supabase
        .from('system_backups')
        .select('*')
        .eq('id', backupId)
        .single()

      if (backupError || !backup) {
        return new Response(
          JSON.stringify({ error: 'Backup não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Download backup file
      const fileName = `${backup.nome}.json`
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('system-backups')
        .download(fileName)

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'Erro ao baixar arquivo de backup' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const backupContent = JSON.parse(await fileData.text())
      let restoredCount = 0

      // Restore each table (using upsert to avoid conflicts)
      for (const [table, records] of Object.entries(backupContent.data)) {
        if (!Array.isArray(records) || records.length === 0) continue

        // Delete existing data first (be careful!)
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

        // Insert backup data in batches
        const batchSize = 100
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          const { error } = await supabase.from(table).insert(batch)
          if (error) {
            console.error(`Error restoring table ${table}:`, error)
          } else {
            restoredCount += batch.length
          }
        }
      }

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'BACKUP_RESTORED',
        table_name: 'system_backups',
        record_id: backupId,
        new_values: { restored_records: restoredCount },
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Backup restaurado com sucesso',
          restored_records: restoredCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backup error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
