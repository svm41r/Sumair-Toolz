/**
 * Sumair Tools Cloud Transcription Serverless Endpoint
 * Endpoint: /api/transcribe
 * -----------------------------------------------------------------
 * Powered by Groq's 100% Free Ultra-Fast Whisper LPU Engine.
 * Zero subscription required, transcribes at 200x real-time speed.
 * Generates and returns pure .SRT text for Sumair Tools Caption Pro!
 */

const fs = require('fs');
const formidable = require('formidable');
const OpenAI = require('openai');

// Groq API Key (defaults to user's free key or Vercel environment variable)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';

// Disable Vercel body parser to stream multipart form-data
export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

function formatSrtTimestamp(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const millis = Math.floor((s - Math.floor(s)) * 1000);
    const totalSec = Math.floor(s);
    const mins = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const hours = Math.floor(mins / 60);
    const m = mins % 60;

    const pad = (num, len = 2) => String(num).padStart(len, '0');
    return `${pad(hours)}:${pad(m)}:${pad(sec)},${pad(millis, 3)}`;
}

const CLAUSE_STARTERS = new Set([
    'before', 'after', 'when', 'while', 'since', 'until', 'as', 'if', 'because', 'although', 'though', 'unless',
    'where', 'wherever', 'whether',
    'and', 'but', 'or', 'so', 'yet', 'nor',
    'not'
]);

const DANGLING_ENDINGS = new Set([
    'a', 'an', 'the',
    'and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'if', 'as', 'that', 'when', 'while', 'before', 'after', 'since', 'until',
    'to', 'for', 'of', 'in', 'on', 'at', 'from', 'with', 'by', 'about', 'into', 'through', 'during', 'without',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'who',
    'is', 'are', 'was', 'were', 'will', 'would', 'can', 'could', 'should', 'might', 'must',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'not'
]);

const ABBREVIATIONS = new Set([
    'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'vs.', 'etc.', 'e.g.', 'i.e.', 'u.s.', 'st.'
]);

function isSentenceTerminal(word) {
    if (!word) return false;
    const clean = word.toLowerCase().trim();
    if (ABBREVIATIONS.has(clean)) return false;
    return /[\.\!\?]["'”’)]?$/.test(clean);
}

function isClauseTerminal(word) {
    if (!word) return false;
    const clean = word.trim();
    return /[,;:\—–-]["'”’)]?$/.test(clean);
}

function isDanglingWord(word) {
    if (!word) return false;
    const clean = word.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    return DANGLING_ENDINGS.has(clean);
}

function isClauseStarter(word) {
    if (!word) return false;
    const clean = word.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    return CLAUSE_STARTERS.has(clean);
}

function smartSegmentWords(words, targetWords = 4) {
    if (!words || words.length === 0) return [];

    const target = Math.max(2, Math.min(8, parseInt(targetWords, 10) || 4));
    const minWords = target <= 2 ? 2 : Math.max(2, Math.floor(target * 0.7));
    const maxWords = target <= 2 ? 3 : Math.min(8, Math.max(target + 2, Math.ceil(target * 1.5)));
    const PAUSE_THRESHOLD = 0.25;

    const segments = [];
    let curWords = [];
    let curStart = 0;
    let curEnd = 0;

    for (let i = 0; i < words.length; i++) {
        const wObj = words[i];
        const wText = (wObj.word || '').trim();
        if (!wText) continue;

        const wStart = typeof wObj.start === 'number' ? wObj.start : parseFloat(wObj.start) || 0;
        const wEnd = typeof wObj.end === 'number' ? wObj.end : parseFloat(wObj.end) || wStart;

        if (curWords.length === 0) curStart = wStart;
        curWords.push({ text: wText, start: wStart, end: wEnd });
        curEnd = wEnd;

        const isLastWord = (i === words.length - 1);
        const nextWordObj = !isLastWord ? words[i + 1] : null;
        const nextText = nextWordObj ? (nextWordObj.word || '').trim() : '';
        const nextStart = nextWordObj ? (typeof nextWordObj.start === 'number' ? nextWordObj.start : parseFloat(nextWordObj.start) || wEnd) : wEnd;
        const pauseAfter = nextStart - wEnd;

        let shouldBreak = false;

        if (isLastWord) {
            shouldBreak = true;
        } else if (isSentenceTerminal(wText)) {
            // Hard stop: Never join sentence boundaries
            shouldBreak = true;
        } else if (isClauseTerminal(wText) && curWords.length >= minWords) {
            // Natural pause at clause boundary
            shouldBreak = true;
        } else if (pauseAfter >= PAUSE_THRESHOLD && curWords.length >= minWords) {
            // Audio gap / breath pause
            shouldBreak = true;
        } else if (curWords.length >= minWords && isClauseStarter(nextText)) {
            // Lookahead: Next word starts a new clause or conjunction (e.g. "before we start", "when", "not")
            // Break here so the new clause stays intact in the next layer!
            shouldBreak = true;
        } else if (curWords.length >= maxWords) {
            // Upper length limit reached
            shouldBreak = true;
        } else if (curWords.length >= target) {
            if (!isDanglingWord(wText)) {
                shouldBreak = true;
            } else if (curWords.length >= maxWords) {
                shouldBreak = true;
            }
        }

        if (shouldBreak) {
            let carryOver = [];
            if (!isLastWord && !isSentenceTerminal(wText)) {
                while (curWords.length > minWords) {
                    const last = curWords[curWords.length - 1];
                    if (isDanglingWord(last.text)) {
                        carryOver.unshift(curWords.pop());
                    } else {
                        break;
                    }
                }
            }

            if (curWords.length > 0) {
                curEnd = curWords[curWords.length - 1].end;
                segments.push({
                    index: segments.length + 1,
                    start: curStart,
                    end: curEnd,
                    text: curWords.map(cw => cw.text).join(' ')
                });
            }

            curWords = carryOver;
            if (curWords.length > 0) {
                curStart = curWords[0].start;
                curEnd = curWords[curWords.length - 1].end;
            }
        }
    }

    if (curWords.length > 0) {
        segments.push({
            index: segments.length + 1,
            start: curStart,
            end: curWords[curWords.length - 1].end,
            text: curWords.map(cw => cw.text).join(' ')
        });
    }

    return segments;
}

function wordsToSrt(words, segments, wordsPerLine = 4) {
    const target = Math.max(2, Math.min(8, parseInt(wordsPerLine, 10) || 4));
    let parsedWords = [];

    if (words && words.length > 0) {
        parsedWords = words;
    } else if (segments && segments.length > 0) {
        // Fallback: interpolate words across segments
        for (const s of segments) {
            const segWords = (s.text || '').trim().split(/\s+/).filter(Boolean);
            const count = segWords.length;
            if (count === 0) continue;
            const dur = Math.max(0.1, Number(s.end) - Number(s.start));
            for (let w = 0; w < count; w++) {
                parsedWords.push({
                    word: segWords[w],
                    start: Number(s.start) + (w / count) * dur,
                    end: Number(s.start) + ((w + 1) / count) * dur
                });
            }
        }
    }

    const captions = smartSegmentWords(parsedWords, target);
    const lines = [];

    for (let i = 0; i < captions.length; i++) {
        const c = captions[i];
        lines.push(String(c.index || (i + 1)));
        lines.push(`${formatSrtTimestamp(c.start)} --> ${formatSrtTimestamp(c.end)}`);
        lines.push(c.text);
        lines.push('');
    }

    return lines.join('\n');
}


export default async function handler(req, res) {
    // 1. CORS headers for Adobe CEP and web browsers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Health check on GET
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            service: 'Sumair Tools Cloud Captioning API',
            endpoint: '/api/transcribe',
            engine: 'Groq Whisper LPU (Ultra-Fast Free Tier)',
            ready: true,
            format: 'SubRip (.srt)'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    let tempFilePath = null;

    try {
        // 2. Parse uploaded file using formidable
        const form = formidable({
            multiples: false,
            keepExtensions: true,
            maxFileSize: 50 * 1024 * 1024 // 50MB per upload
        });

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, flds, fls) => {
                if (err) reject(err);
                else resolve([flds, fls]);
            });
        });

        let uploadedFile = files.file;
        if (Array.isArray(uploadedFile)) {
            uploadedFile = uploadedFile[0];
        }

        if (!uploadedFile || !uploadedFile.filepath) {
            return res.status(400).json({ error: "No file found. Upload multipart form-data with 'file' field." });
        }

        tempFilePath = uploadedFile.filepath;

        // 3. Connect to Groq Whisper API
        const client = new OpenAI({
            apiKey: GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });

        const fileStream = fs.createReadStream(tempFilePath);
        const languageParam = (fields.language && fields.language[0] && fields.language[0] !== 'auto') ? fields.language[0] : undefined;

        // 4. Run Groq ultra-fast Whisper transcription with word timestamps
        const transcription = await client.audio.transcriptions.create({
            file: fileStream,
            model: 'whisper-large-v3-turbo',
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
            language: languageParam
        });

        // 5. Convert words/segments into 4 to 8 words maximum .SRT subtitle format
        const wordsPerLine = (fields.words_per_line && fields.words_per_line[0]) || 6;
        const srtContent = wordsToSrt(transcription.words, transcription.segments, wordsPerLine);

        // 6. Return pure .SRT text
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="captions.srt"');
        return res.status(200).send(srtContent);

    } catch (err) {
        console.error('[Sumair Tools Groq API Error]:', err);
        return res.status(500).json({
            error: 'Transcription failed: ' + (err.message || err.toString())
        });

    } finally {
        // Clean up temporary disk file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
    }
}
