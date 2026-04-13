-- Create table for tracking taxes and deadlines
CREATE TABLE IF NOT EXISTS public.taxes_due (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    tax_name TEXT NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
    notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.taxes_due ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view taxes of their own organization"
    ON public.taxes_due FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE organization_id = taxes_due.organization_id
    ));

CREATE POLICY "Users can insert taxes to their own organization"
    ON public.taxes_due FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM profiles WHERE organization_id = taxes_due.organization_id
    ));

CREATE POLICY "Users can update taxes of their own organization"
    ON public.taxes_due FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE organization_id = taxes_due.organization_id
    ));
