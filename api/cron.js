import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variables d\'environnement Supabase manquantes' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Petite requête pour réveiller la base de données
    const { data, error } = await supabase.from('utilisateurs').select('id').limit(1);

    if (error) throw error;

    return res.status(200).json({ 
      status: 'OK', 
      message: 'Supabase est bien réveillé !',
      time: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors du réveil de Supabase' });
  }
}
