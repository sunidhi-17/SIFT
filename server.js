const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve the built React app from the public folder
app.use(express.static('public'));

// Hardcoded Crisis Gate Configuration (per principles)
const CRISIS_GATE_CONFIG = {
  region: 'US', // default
  patterns: [
    /(?:suicid|kill myself|end my life|want to die|take my life)/i,
    /(?:self[-\s]harm|cut myself|hurt myself|no way out|can'?t go on)/i
  ],
  helplines: {
    'US': { text: 'National Suicide Prevention Lifeline: 988', phone: '988', warning: 'verify before use' },
    'UK': { text: 'National Suicide Prevention Helpline UK: 0800 689 5652', phone: '0800 689 5652', warning: 'verify before use' }
  }
};

const ai = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-2.5-flash';

// Crisis gate middleware 
const crisisGateMiddleware = (req, res, next) => {
  const note = req.body.note || '';
  for (const pattern of CRISIS_GATE_CONFIG.patterns) {
    if (pattern.test(note)) {
      return res.status(200).json({
        isCrisis: true,
        helpline: CRISIS_GATE_CONFIG.helplines[CRISIS_GATE_CONFIG.region]
      });
    }
  }
  next();
};

const SYSTEM_PROMPT_BASE = `
You are Sift, a cycle-aware mood evidence tool.
NON-NEGOTIABLE PRINCIPLES:
- You ONLY narrate the pre-computed stats we provide via JSON.
- DO NOT introduce any unprovided figures. If you output a number that was not in the input context, you fail.
- NO diagnosis, NO medication/supplement/dosing advice.
- Approved framing: "consistent with cycle-linked mood changes; worth discussing with a professional."
- Every verdict must be hedged: it shows ASSOCIATION, not cause, and does not rule anything out.
- Assume the user is experiencing unpredictable life and keep wording entirely neutral (no assumptions about gender).
`;

const extractJson = (text) => {
  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON from AI response", text);
    return null;
  }
};

app.post('/api/insight', crisisGateMiddleware, async (req, res) => {
  const { gridStats, forecastWindow, pastWhatHelped, note } = req.body;
  if (!ai) {
    return res.status(200).json({
      isCrisis: false,
      insight: "Offline mode: Your premenstrual days show a slight drop compared to the rest of the cycle. Not enough AI availability to elaborate.",
      headsUpDraft: "I may be short-tempered soon; it's not about you."
    });
  }

  try {
    const prompt = `
Context summary JSON:\n${JSON.stringify({ gridStats, forecastWindow })}\n
Generate a short 1-2 sentence gentle verdict focusing on the patterns found in the grid.
Next, generate a 1-sentence shareable heads-up message drafted from the first-person perspective that the user can send to loved ones.
Output strictly JSON: { "insight": "text", "headsUpDraft": "text" }.
`;

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT_BASE,
    });
    
    const responseData = await model.generateContent(prompt);
    const response = responseData.response;

    res.json({ isCrisis: false, data: extractJson(response.text) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

app.post('/api/tag', crisisGateMiddleware, async (req, res) => {
  const { note, mood } = req.body;
  if (!ai) return res.json({ tagged: [] });
  try {
    const prompt = `
Analyze this journal note: "${note}", given the self-reported mood was ${mood}/5.
Tag each sentence as "statement", "understatement", or "overstatement", and provide one calmer, truthful rewrite if the sentence is an overstatement/understatement.
Flag contradiction = true if note tone starkly contrasts with the mood score.
Output STRICTLY JSON array of objects: [{ "sentence": "text", "tag": "statement|understatement|overstatement", "rewrite": "text" }].
And a root field { "sentences": [...], "hasContradiction": boolean }.
`;
    // ... Implement similar to above. Keeping this simple for MVP.
    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT_BASE,
    });
    
    const responseData = await model.generateContent(prompt);
    const response = responseData.response;

    res.json(extractJson(response.text));
  } catch(e) {
    res.json({ sentences: [], hasContradiction: false });
  }
});

// De-escalation endpoint — voice-first flow
const DEESCALATION_PROMPT = `
You are Sift's de-escalation assistant. You help users understand their communication patterns and find calmer ways to express themselves.
NON-NEGOTIABLE:
- NEVER diagnose emotions, aggression, mental illness, personality, or intent.
- NEVER say "you are angry" or "you are aggressive."
- Use language like "your speech pattern appears more elevated than your baseline" or "the language contains absolute statements that may increase conflict."
- Distinguish SIGNAL (what was measured), INTERPRETATION (what it might indicate), and USER CHOICE (what they do next).
- The user remains in control. Offer options, not directives.
- Output STRICTLY JSON.
`;

app.post('/api/deescalate', crisisGateMiddleware, async (req, res) => {
  const { transcript, selfReportedMood, speechRateChange, intensityChange, pauseChange, possibleElevation, confidence } = req.body;

  if (!ai) {
    return res.json({
      summary: "Your speech shows some changes from your baseline. This may reflect heightened emotional arousal, though this interpretation may be inaccurate.",
      communicationPattern: "possible_overstatement",
      recommendedAction: "pause",
      calmerRewrite: "I feel like my concerns aren't being heard, and I'd like us to talk about that.",
      reflectionPrompt: "What were you feeling right before you started speaking?",
      confidence: confidence || "moderate"
    });
  }

  try {
    const prompt = `
Analyze this spoken transcript for communication patterns:
Transcript: "${transcript}"
Self-reported mood: ${selfReportedMood}
Voice signals: speech rate change ${(speechRateChange * 100).toFixed(0)}%, intensity change ${(intensityChange * 100).toFixed(0)}%, pause change ${(pauseChange * 100).toFixed(0)}%
Possible elevation: ${possibleElevation}, confidence: ${confidence}

Return JSON:
{
  "summary": "1-2 sentence observation about communication pattern, hedged, non-diagnostic",
  "communicationPattern": "statement|possible_overstatement|possible_understatement",
  "recommendedAction": "continue|pause|reframe",
  "calmerRewrite": "a calmer way to express the same core message",
  "assertiveRewrite": "a direct but non-escalating version",
  "reflectionPrompt": "one question to help the user reflect",
  "confidence": "low|moderate|high"
}`;

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: DEESCALATION_PROMPT,
    });
    const responseData = await model.generateContent(prompt);
    const response = responseData.response;
    const parsed = extractJson(response.text());
    res.json(parsed || {
      summary: "Analysis could not be completed.",
      communicationPattern: "statement",
      recommendedAction: "continue",
      calmerRewrite: transcript,
      reflectionPrompt: "How are you feeling right now?",
      confidence: "low"
    });
  } catch (error) {
    console.error('Deescalation error:', error);
    res.json({
      summary: "Analysis temporarily unavailable.",
      communicationPattern: "statement",
      recommendedAction: "continue",
      calmerRewrite: transcript,
      reflectionPrompt: "How are you feeling right now?",
      confidence: "low"
    });
  }
});

// Reflection endpoint — post-intervention summary
app.post('/api/reflection', crisisGateMiddleware, async (req, res) => {
  const { transcript, trigger, feeling, noticed, whatHelped } = req.body;

  if (!ai) {
    return res.json({
      summary: "You noticed changes in your speech pattern and chose to pause. This awareness is itself a meaningful step.",
      pattern: "self-awareness",
      suggestion: "Consider noting what helped so you can use it again next time."
    });
  }

  try {
    const prompt = `
Summarize this user's reflection after a de-escalation intervention.
What triggered: "${trigger}"
What they felt: "${feeling}"
What they noticed about their voice: "${noticed}"
What helped: "${whatHelped}"
Original transcript: "${transcript}"

Return JSON:
{
  "summary": "1-2 sentence empathetic, non-diagnostic summary of the pattern they noticed",
  "pattern": "a short label for what they discovered (e.g. 'speed-before-frustration')",
  "suggestion": "one gentle, non-prescriptive suggestion"
}
Do NOT diagnose. Do NOT claim certainty. Present observations.`;

    const model = ai.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: DEESCALATION_PROMPT,
    });
    const responseData = await model.generateContent(prompt);
    const response = responseData.response;
    const parsed = extractJson(response.text());
    res.json(parsed || {
      summary: "Your reflection has been recorded.",
      pattern: "self-observation",
      suggestion: "Keep noticing what helps."
    });
  } catch (error) {
    console.error('Reflection error:', error);
    res.json({
      summary: "Reflection saved.",
      pattern: "self-observation",
      suggestion: "Keep noticing what helps."
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
