#!/usr/bin/env node
// ================================================
// Subir preguntas a Supabase via API
// ================================================
// Uso:
//   npm install @supabase/supabase-js
//   export SUPABASE_SERVICE_KEY="eyJ..."  <- service_role key de Settings > API
//   node scripts/upload_questions.js

const { createClient } = require("@supabase/supabase-js");
const questions = require("../src/questions_full.json");

const SUPABASE_URL = "https://zonsbegwclplvhiuuiss.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error("Necesitas definir SUPABASE_SERVICE_KEY:");
  console.error("  export SUPABASE_SERVICE_KEY=eyJ...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log(`Subiendo ${questions.length} preguntas...`);

  // Transformar al formato de la tabla
  const rows = questions.map(q => ({
    categoria:  q.categoria,
    pelicula:   q.pelicula,
    estudio:    q.estudio,
    dificultad: q.dificultad,
    pregunta:   q.pregunta,
    opcion_0:   q.opciones[0],
    opcion_1:   q.opciones[1],
    opcion_2:   q.opciones[2],
    opcion_3:   q.opciones[3],
    correcta:   q.correcta,
    dato:       q.dato || null
  }));

  // Vaciar tabla
  console.log("Vaciando tabla...");
  await supabase.from("preguntas").delete().neq("id", 0);

  // Insertar en bloques de 500
  const SIZE = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += SIZE) {
    const chunk = rows.slice(i, i + SIZE);
    const { error } = await supabase.from("preguntas").insert(chunk);
    if (error) { console.error("ERROR bloque", Math.floor(i/SIZE)+1, error.message); process.exit(1); }
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${rows.length} preguntas subidas...`);
  }
  console.log(`\n✓ Listo! ${done} preguntas en Supabase.`);
}

main().catch(e => { console.error(e); process.exit(1); });
