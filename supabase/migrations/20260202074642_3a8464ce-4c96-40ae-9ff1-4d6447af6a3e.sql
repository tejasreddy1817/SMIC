-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types
CREATE TYPE public.platform_type AS ENUM ('instagram', 'youtube_shorts', 'tiktok');
CREATE TYPE public.content_status AS ENUM ('draft', 'saved', 'used');
CREATE TYPE public.script_status AS ENUM ('draft', 'approved', 'posted');
CREATE TYPE public.trend_type AS ENUM ('hashtag', 'audio', 'topic', 'keyword');
CREATE TYPE public.content_type AS ENUM ('caption', 'script', 'bio', 'comment');
CREATE TYPE public.content_format AS ENUM ('skit', 'explainer', 'pov', 'reaction', 'storytime', 'listicle', 'tutorial', 'challenge');

-- Creators table (linked to auth.users)
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  niches TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['en'],
  platform_focus platform_type[] DEFAULT ARRAY['instagram'::platform_type],
  onboarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice samples for training creator's voice
CREATE TABLE public.creator_voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  content_type content_type NOT NULL DEFAULT 'caption',
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Computed voice profile with embeddings
CREATE TABLE public.creator_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL UNIQUE,
  embedding vector(1536),
  style_tags TEXT[] DEFAULT '{}',
  tone_descriptors JSONB DEFAULT '{}',
  vocabulary_patterns JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Raw trend data
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_type NOT NULL,
  trend_type trend_type NOT NULL DEFAULT 'topic',
  title TEXT NOT NULL,
  raw_content TEXT,
  source_url TEXT,
  language TEXT DEFAULT 'en',
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.creators(id) ON DELETE SET NULL
);

-- Processed trend analysis with scores
CREATE TABLE public.trend_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES public.trends(id) ON DELETE CASCADE NOT NULL UNIQUE,
  velocity_score NUMERIC(5,2) DEFAULT 0,
  novelty_score NUMERIC(5,2) DEFAULT 0,
  competition_score NUMERIC(5,2) DEFAULT 0,
  opportunity_score NUMERIC(5,2) DEFAULT 0,
  relevance_niches TEXT[] DEFAULT '{}',
  embedding vector(1536),
  ai_summary TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Generated content ideas
CREATE TABLE public.content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  hook TEXT NOT NULL,
  angle TEXT,
  format content_format DEFAULT 'explainer',
  emotion TEXT,
  estimated_length TEXT,
  difficulty TEXT DEFAULT 'easy',
  originality_score NUMERIC(5,2) DEFAULT 0,
  SMICplicity_score NUMERIC(5,2) DEFAULT 0,
  creator_fit_score NUMERIC(5,2) DEFAULT 0,
  viral_potential NUMERIC(5,2) DEFAULT 0,
  status content_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Full scripts
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  hook_text TEXT NOT NULL,
  body_beats JSONB DEFAULT '[]',
  visual_cues JSONB DEFAULT '[]',
  caption TEXT,
  cta TEXT,
  language TEXT DEFAULT 'en',
  version INTEGER DEFAULT 1,
  word_count INTEGER DEFAULT 0,
  estimated_duration INTEGER DEFAULT 30,
  status script_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance predictions
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE NOT NULL,
  predicted_views_low INTEGER DEFAULT 0,
  predicted_views_high INTEGER DEFAULT 0,
  retention_score NUMERIC(5,2) DEFAULT 0,
  virality_score NUMERIC(5,2) DEFAULT 0,
  hook_strength NUMERIC(5,2) DEFAULT 0,
  pacing_score NUMERIC(5,2) DEFAULT 0,
  emotional_arc NUMERIC(5,2) DEFAULT 0,
  cta_strength NUMERIC(5,2) DEFAULT 0,
  confidence NUMERIC(5,2) DEFAULT 0,
  feature_breakdown JSONB DEFAULT '{}',
  improvement_suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Actual posted content performance (for future ML training)
CREATE TABLE public.posted_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  external_url TEXT,
  actual_views INTEGER DEFAULT 0,
  actual_likes INTEGER DEFAULT 0,
  actual_shares INTEGER DEFAULT 0,
  actual_saves INTEGER DEFAULT 0,
  actual_comments INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performance_captured_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posted_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creators
CREATE POLICY "Users can view own creator profile"
  ON public.creators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own creator profile"
  ON public.creators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creator profile"
  ON public.creators FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for voice samples
CREATE POLICY "Users can view own voice samples"
  ON public.creator_voice_samples FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own voice samples"
  ON public.creator_voice_samples FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own voice samples"
  ON public.creator_voice_samples FOR UPDATE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own voice samples"
  ON public.creator_voice_samples FOR DELETE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- RLS Policies for voice profiles
CREATE POLICY "Users can view own voice profile"
  ON public.creator_voice_profiles FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own voice profile"
  ON public.creator_voice_profiles FOR ALL
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- RLS Policies for trends (viewable by all authenticated users, created by owner)
CREATE POLICY "Authenticated users can view all trends"
  ON public.trends FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create trends"
  ON public.trends FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own trends"
  ON public.trends FOR UPDATE
  USING (created_by IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own trends"
  ON public.trends FOR DELETE
  USING (created_by IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- RLS Policies for trend analysis
CREATE POLICY "Authenticated users can view trend analysis"
  ON public.trend_analysis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage trend analysis"
  ON public.trend_analysis FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for content ideas
CREATE POLICY "Users can view own ideas"
  ON public.content_ideas FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own ideas"
  ON public.content_ideas FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own ideas"
  ON public.content_ideas FOR UPDATE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own ideas"
  ON public.content_ideas FOR DELETE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- RLS Policies for scripts
CREATE POLICY "Users can view own scripts"
  ON public.scripts FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own scripts"
  ON public.scripts FOR UPDATE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own scripts"
  ON public.scripts FOR DELETE
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- RLS Policies for predictions
CREATE POLICY "Users can view predictions for own scripts"
  ON public.predictions FOR SELECT
  USING (script_id IN (
    SELECT s.id FROM public.scripts s 
    JOIN public.creators c ON s.creator_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "System can create predictions"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for posted content
CREATE POLICY "Users can view own posted content"
  ON public.posted_content FOR SELECT
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own posted content"
  ON public.posted_content FOR ALL
  USING (creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_profiles_updated_at
  BEFORE UPDATE ON public.creator_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create creator profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creators (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create creator profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_creators_user_id ON public.creators(user_id);
CREATE INDEX idx_voice_samples_creator_id ON public.creator_voice_samples(creator_id);
CREATE INDEX idx_trends_platform ON public.trends(platform);
CREATE INDEX idx_trends_detected_at ON public.trends(detected_at DESC);
CREATE INDEX idx_content_ideas_creator_id ON public.content_ideas(creator_id);
CREATE INDEX idx_content_ideas_status ON public.content_ideas(status);
CREATE INDEX idx_scripts_creator_id ON public.scripts(creator_id);
CREATE INDEX idx_scripts_status ON public.scripts(status);
CREATE INDEX idx_predictions_script_id ON public.predictions(script_id);