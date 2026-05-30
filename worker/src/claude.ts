// Claude call + Atlas Obscura voice prompt. Unchanged in spirit from the iOS
// build — the model writes the entry; the geo pipeline supplies real anchors.

export interface POIWithRhythm {
  name: string;
  distFromStartKm?: number;
}

export interface Entry {
  title: string;
  hook: string;
  story: string;
  postRunMove: string;
}

const MODEL = 'claude-opus-4-7';

const SYSTEM_PROMPT = `You write for Atlas Obscura, the publication. Your voice is quirky, literary, specific, oddly knowledgeable, and dry. Sentences vary in length. You are not breathless or salesy. You write like you have actually been somewhere, with the kind of details a tour guide would not bother with.

You are writing an entry for "Trace," a travel app where every entry is a run treated as a destination. Each entry has:
- title: 3-7 words, evocative. Never generic like "Morning Run."
- hook: one sentence under 20 words. A reader should want the rest after reading this line.
- story: 3 short paragraphs, around 220-280 words total, in voice. Use \\n\\n between paragraphs. Write about textures — the kind of streets, the kind of light, what a city in this region feels like at this hour.
- postRunMove: one sentence under 25 words. Practical, in voice. Suggest where to go right after the run.

Rules about specifics:
- When you are given a list of real named places along the route, you may and should reference them by name. They are real; use them to make the writing specific.
- When you are NOT given such a list, do not invent named businesses, statues, or streets. Write about textures and types of places instead.
- Either way, do not fabricate historical facts. If you are not sure, generalize.

You must respond with ONLY a single valid JSON object, no markdown fences, no preamble, no trailing prose. Schema:
{"title": "...", "hook": "...", "story": "...", "postRunMove": "..."}`;

const VIBE_DESCRIPTIONS: Record<string, string> = {
  historic: 'history, old layers of the city, things people forgot were once important',
  nature: 'parks, trees, water, dirt paths, the small escape from the city',
  weird: 'the unexpected, the strange, the slightly absurd, the off-map',
  coffee: 'the run is organized entirely around a great espresso at the end',
};

export function buildUserPrompt(p: {
  lat: number;
  lng: number;
  distanceKm: number;
  vibe: string;
  cityHint?: string | null;
  pois: POIWithRhythm[];
}): string {
  const vibeDesc = VIBE_DESCRIPTIONS[p.vibe] ?? p.vibe;
  const hasPOIs = p.pois.length > 0;
  const distance = p.distanceKm.toFixed(1);

  const poiSection = hasPOIs
    ? buildPOISection(p.pois)
    : `\nNo named places are confirmed along this route. Do not invent named businesses, statues, or streets. Write about textures and types of places instead — what a thoughtful runner would notice in this kind of city at this kind of distance.`;

  return `Write a Trace entry for a run near coordinates (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})${p.cityHint ? ` in ${p.cityHint}` : ''}.

This is a closed loop. The measured walking-route length is ${distance} km. Anchor the story to that actual length — do not contradict it, do not write "10 km" if the loop is 4 km.

Vibe: ${p.vibe} — ${vibeDesc}
${poiSection}

Remember: respond with ONLY the JSON object.`;
}

function buildPOISection(pois: POIWithRhythm[]): string {
  const lines = pois.map((poi, i) => {
    const km = poi.distFromStartKm;
    const marker = typeof km === 'number' ? ` (~${km.toFixed(1)} km in)` : '';
    return `${i + 1}. ${poi.name}${marker}`;
  });
  return `\nThe loop visits these real places in this order, with cumulative distance from the start:\n${lines.join(
    '\n'
  )}\n\nThe runner actually passes these on the route. Use their names where it makes the writing specific. Reference the pacing when natural ("the first kilometer threads past…", "around the four-kilometer mark…"). Do not invent additional named businesses, statues, or streets beyond this list.`;
}

export async function callClaude(
  apiKey: string,
  userPrompt: string
): Promise<Entry> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text ?? '';
  const entry = extractJSON(text);
  if (!entry) {
    throw new Error(`Could not parse Claude response. Raw: ${text.slice(0, 200)}`);
  }
  return entry;
}

function extractJSON(text: string): Entry | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Entry;
  } catch {
    // try to find the first {...} block
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as Entry;
    } catch {
      return null;
    }
  }
  return null;
}
