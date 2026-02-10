-- Verificar las políticas actuales de campaign_sends
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'campaign_sends';

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON campaign_sends;

-- Crear una política más permisiva para INSERT
CREATE POLICY "Allow authenticated users to insert campaign_sends" 
ON campaign_sends
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Crear una política para SELECT
CREATE POLICY "Allow authenticated users to select campaign_sends" 
ON campaign_sends
FOR SELECT
TO authenticated
USING (true);

-- Crear una política para UPDATE
CREATE POLICY "Allow authenticated users to update campaign_sends" 
ON campaign_sends
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Crear una política para DELETE
CREATE POLICY "Allow authenticated users to delete campaign_sends" 
ON campaign_sends
FOR DELETE
TO authenticated
USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'campaign_sends';
