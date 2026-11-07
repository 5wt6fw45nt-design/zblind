-- Recorrido sin datos nuevos de la persona: lecciones abiertas (la más alta) y último día de uso.
ALTER TABLE users ADD COLUMN seen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_day TEXT;
