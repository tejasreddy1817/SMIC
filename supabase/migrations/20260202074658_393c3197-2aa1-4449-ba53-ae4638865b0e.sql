-- Fix permissive RLS policies by adding proper ownership checks

-- Drop overly permissive policies on trends
DROP POLICY IF EXISTS "Users can create trends" ON public.trends;
DROP POLICY IF EXISTS "System can manage trend analysis" ON public.trend_analysis;
DROP POLICY IF EXISTS "System can create predictions" ON public.predictions;

-- Recreate with proper checks
CREATE POLICY "Users can create trends"
  ON public.trends FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IS NULL OR 
    created_by IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- Trend analysis should be insertable by creator who owns the trend
CREATE POLICY "Users can create trend analysis"
  ON public.trend_analysis FOR INSERT
  TO authenticated
  WITH CHECK (
    trend_id IN (
      SELECT id FROM public.trends WHERE created_by IN (
        SELECT id FROM public.creators WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update trend analysis"
  ON public.trend_analysis FOR UPDATE
  TO authenticated
  USING (
    trend_id IN (
      SELECT id FROM public.trends WHERE created_by IN (
        SELECT id FROM public.creators WHERE user_id = auth.uid()
      )
    )
  );

-- Predictions can be created for scripts owned by the user
CREATE POLICY "Users can create predictions for own scripts"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    script_id IN (
      SELECT s.id FROM public.scripts s 
      JOIN public.creators c ON s.creator_id = c.id 
      WHERE c.user_id = auth.uid()
    )
  );