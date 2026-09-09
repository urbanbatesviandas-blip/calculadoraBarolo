-- ==============================================================================
-- SISTEMA DE GESTIÓN DE EVENTOS — PALACIO BAROLO
-- Esquema de Base de Datos para Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 2. Tabla de Perfiles y Roles de Usuario
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    email text unique,
    full_name text,
    role text not null default 'comercial' check (role in ('admin', 'comercial', 'viewer')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Trigger para crear perfil automáticamente al registrarse en Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'comercial')
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 3. Tabla Principal de Eventos
create table if not exists public.events (
    id uuid primary key default uuid_generate_v4(),
    calc_code text unique,
    name text not null,
    client_name text,
    client_cuit text,
    client_contact text,
    event_date date not null,
    event_time text default '19:00',
    month text,
    venue text not null default 'Espacio Barolo',
    event_type text not null default 'Social',
    origin text default 'Externo',
    status text not null default 'cotizado' check (status in ('contratado', 'reservado', 'cotizado', 'cancelado')),
    agreement_type text default '100% Barolo',
    attendees integer default 25,
    preventa_qty integer default 0,
    preventa_price numeric(14,2) default 0,
    general_qty integer default 0,
    general_price numeric(14,2) default 0,
    alquiler_espacio numeric(14,2) default 0,
    contratacion_salon numeric(14,2) default 0,
    extra_incomes jsonb default '[]'::jsonb,
    ticket_qty integer default 0,
    ticket_price numeric(14,2) default 0,
    gross_income numeric(14,2) not null default 0,
    cost_artistas numeric(14,2) default 0,
    cost_tecnica numeric(14,2) default 0,
    cost_disertantes numeric(14,2) default 0,
    cost_catering numeric(14,2) default 0,
    cost_mobiliario numeric(14,2) default 0,
    cost_gastronomicos numeric(14,2) default 0,
    cost_rrhh numeric(14,2) default 0,
    cost_limpieza numeric(14,2) default 0,
    cost_seguros numeric(14,2) default 0,
    cost_alquiler_espacio numeric(14,2) default 0,
    cost_marketing numeric(14,2) default 0,
    cost_sadaic numeric(14,2) default 0,
    extra_expenses jsonb default '[]'::jsonb,
    direct_costs numeric(14,2) not null default 0,
    indirect_costs numeric(14,2) not null default 0,
    total_costs numeric(14,2) not null default 0,
    net_profit numeric(14,2) not null default 0,
    barolo_profit numeric(14,2) not null default 0,
    margin_pct numeric(6,2) default 0,
    payment_method text,
    invoice_type text,
    cancellation_reason text,
    notes text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Índices para búsqueda rápida en calendario y dashboard
create index if not exists idx_events_date on public.events(event_date);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_venue on public.events(venue);

-- 4. Tabla de Desglose de Otros Ingresos
create table if not exists public.event_income_items (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references public.events(id) on delete cascade,
    concept text not null,
    amount numeric(14,2) not null default 0,
    category text default 'general',
    created_at timestamptz default now()
);

-- 5. Tabla de Desglose de Costos (Directos e Indirectos)
create table if not exists public.event_cost_items (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references public.events(id) on delete cascade,
    concept text not null,
    amount numeric(14,2) not null default 0,
    cost_type text not null default 'directo' check (cost_type in ('directo', 'indirecto')),
    category text default 'operativo',
    created_at timestamptz default now()
);

-- 6. Trigger para auto-actualizar updated_at en events
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_updated_at on public.events;
create trigger trigger_set_updated_at
    before update on public.events
    for each row execute function public.set_updated_at();

-- 7. Seguridad Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_income_items enable row level security;
alter table public.event_cost_items enable row level security;

-- Políticas permisivas para desarrollo / equipo
create policy "Usuarios autenticados pueden ver perfiles"
    on public.profiles for select
    to authenticated using (true);

create policy "Usuarios autenticados pueden ver eventos"
    on public.events for select
    to authenticated using (true);

create policy "Comerciales y Admins pueden crear/modificar eventos"
    on public.events for all
    to authenticated using (true) with check (true);

create policy "Usuarios autenticados pueden gestionar ingresos"
    on public.event_income_items for all
    to authenticated using (true) with check (true);

create policy "Usuarios autenticados pueden gestionar costos"
    on public.event_cost_items for all
    to authenticated using (true) with check (true);

-- Permitir también acceso anónimo (Anon Key) con lectura y escritura si el proyecto está configurado sin login obligatorio
create policy "Anon select events" on public.events for select to anon using (true);
create policy "Anon insert events" on public.events for insert to anon with check (true);
create policy "Anon update events" on public.events for update to anon using (true);
create policy "Anon delete events" on public.events for delete to anon using (true);

create policy "Anon select income" on public.event_income_items for select to anon using (true);
create policy "Anon insert income" on public.event_income_items for insert to anon with check (true);
create policy "Anon update income" on public.event_income_items for update to anon using (true);
create policy "Anon delete income" on public.event_income_items for delete to anon using (true);

create policy "Anon select costs" on public.event_cost_items for select to anon using (true);
create policy "Anon insert costs" on public.event_cost_items for insert to anon with check (true);
create policy "Anon update costs" on public.event_cost_items for update to anon using (true);
create policy "Anon delete costs" on public.event_cost_items for delete to anon using (true);

-- Habilitar Realtime para eventos
alter publication supabase_realtime add table public.events;
