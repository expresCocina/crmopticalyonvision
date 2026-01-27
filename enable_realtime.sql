-- Enable Realtime for the main tables used in Dashboard
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table purchases;
