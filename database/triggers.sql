-- Trigger: Update Lead Status on New Appointment
create or replace function public.handle_new_appointment()
returns trigger as $$
begin
  -- Update the related lead's status to 'agendado'
  update public.leads
  set 
    status = 'agendado',
    last_interaction = now(),
    updated_at = now()
  where id = new.lead_id
  and status not in ('cliente', 'recurrente'); 
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error 42710
drop trigger if exists on_appointment_created on public.appointments;

create trigger on_appointment_created
  after insert on public.appointments
  for each row execute procedure public.handle_new_appointment();

-- Trigger: Update Lead Status on Purchase (Paid)
create or replace function public.handle_new_purchase()
returns trigger as $$
begin
  -- If status is 'paid', promote lead to 'cliente' or 'recurrente'
  if new.status = 'paid' then
     update public.leads
     set 
       status = (
          case 
             when status = 'cliente' then 'recurrente'
             else 'cliente'
          end
       )::lead_status,
       last_interaction = now(),
       updated_at = now()
     where id = new.lead_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error 42710
drop trigger if exists on_purchase_created_or_updated on public.purchases;

create trigger on_purchase_created_or_updated
  after insert or update on public.purchases
  for each row execute procedure public.handle_new_purchase();
