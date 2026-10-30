// Sunrise palette, handed out in turn so each new topic gets a distinct colour.
// Pure data, so both server code and client components can import it.
export const TOPIC_COLORS = ["#c8323b", "#f6c453", "#f4878a", "#7a1d24", "#e8793a", "#3f8f4f"];

export const MAX_TOPIC_NAME = 40;

// trims, collapses inner whitespace and caps the length
export const cleanTopicName = (raw: string) => raw.trim().replace(/\s+/g, " ").slice(0, MAX_TOPIC_NAME);
