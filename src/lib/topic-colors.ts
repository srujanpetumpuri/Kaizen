// Neon Aura palette, handed out in turn so each new topic gets a distinct colour.
// Pure data, so both server code and client components can import it.
export const TOPIC_COLORS = ["#ff4f6d", "#ffb347", "#ff8fc0", "#a259ff", "#ff7a3d", "#37d6c4"];

export const MAX_TOPIC_NAME = 40;

// trims, collapses inner whitespace and caps the length
export const cleanTopicName = (raw: string) => raw.trim().replace(/\s+/g, " ").slice(0, MAX_TOPIC_NAME);
