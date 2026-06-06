import { type ReactNode, useEffect, useRef, useState } from 'react'
import { cer } from '../inference/decode'
import { loadSession } from '../inference/onnx'
import { generateAudio } from '../inference/generate'
import { randomCallsign, callsignRegion } from '../inference/callsign'
import { decodeDualCallsignDataUri, type DualDecodeResult } from '../inference/dualDecode'
import { Bot, Equal, Loader2, Play, Send, Swords, Target, TriangleAlert, Trophy, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TONE_FREQ = 700
const MAX_LISTENS = 1

type Phase = 'idle' | 'listening' | 'guessing' | 'graded'

interface Round {
  text: string
  region: 'US' | 'Canada' | 'World'
  wpm: number
  snr: number
  dataUri: string
}

function randomRound(): Round {
  const wpm = 20 + Math.floor(Math.random() * 11)
  const snr = -14 + Math.floor(Math.random() * 7)
  const text = randomCallsign()
  const region = callsignRegion(text)
  const sentText = `${text} ${text}`
  const out = generateAudio({ text: sentText, wpm, snrDb: snr, frequency: TONE_FREQ })
  return { text, region, wpm, snr, dataUri: out.dataUri }
}

export default function BeatTheBotPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<Round | null>(null)
  const [listens, setListens] = useState(0)
  const [guess, setGuess] = useState('')
  const [botResult, setBotResult] = useState<DualDecodeResult | null>(null)
  const [modelReady, setModelReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [score, setScore] = useState({ wins: 0, losses: 0, ties: 0 })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    loadSession()
      .then(() => setModelReady(true))
      .catch((e) => setError(String(e)))
  }, [])

  function startRound() {
    setError(null)
    setBotResult(null)
    setGuess('')
    setListens(0)
    setIsPlaying(false)
    const r = randomRound()
    setRound(r)
    setPhase('listening')
  }

  function playAudio() {
    if (!audioRef.current || !round) return
    if (listens >= MAX_LISTENS) return
    if (isPlaying) return
    setIsPlaying(true)
    setListens((n) => n + 1)
    const audio = audioRef.current
    audio.currentTime = 0
    void audio.play()
    const onEnd = () => {
      audio.removeEventListener('ended', onEnd)
      setIsPlaying(false)
    }
    audio.addEventListener('ended', onEnd)
  }

  async function submitGuess() {
    if (!round) return
    setPhase('guessing')
    try {
      const res = await decodeDualCallsignDataUri(round.dataUri, TONE_FREQ)
      setBotResult(res)
      const userCer = cer(round.text, guess.toUpperCase().trim())
      const botCer = cer(round.text, res.text)
      setScore((s) => {
        if (userCer < botCer) return { ...s, wins: s.wins + 1 }
        if (userCer > botCer) return { ...s, losses: s.losses + 1 }
        return { ...s, ties: s.ties + 1 }
      })
      setPhase('graded')
    } catch (e) {
      setError(String(e))
      setPhase('listening')
    }
  }

  const userCerPct = round && phase === 'graded'
    ? cer(round.text, guess.toUpperCase().trim()) * 100
    : null
  const botCerPct = round && botResult
    ? cer(round.text, botResult.text) * 100
    : null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Swords className="size-6" />
        <h1 className="text-[28px] font-semibold text-foreground tracking-[-0.4px] m-0">Beat the Bot</h1>
      </div>
      <p className="mb-3">
        Listen to a random callsign sent twice in CW (20–30 WPM, low SNR), the way
        operators repeat their own call. You and the bot both get the same clip —
        one shot at it. Type your guess; we grade both decodes on character error rate.
      </p>

      <Card className="mb-4">
        <CardContent>
          <div className="flex items-center mb-[10px] flex-wrap justify-between">
            <div className="flex gap-5">
              <Stat label="You" value={score.wins.toString()} accent="good" icon={<Trophy className="size-4 text-muted-foreground" />} />
              <Stat label="Bot" value={score.losses.toString()} accent="bad" icon={<Bot className="size-4 text-muted-foreground" />} />
              <Stat label="Ties" value={score.ties.toString()} icon={<Equal className="size-4 text-muted-foreground" />} />
            </div>
            <Button disabled={!modelReady} onClick={startRound}>
              {round ? 'New round' : 'Start'}
            </Button>
          </div>
          {!modelReady && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Loader2 className="animate-spin size-4" /> Loading model…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1 text-bad font-mono">
              <TriangleAlert className="size-4" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {round && phase !== 'idle' && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Round</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-[13px]">
              callsign · approx {round.wpm} wpm · SNR {round.snr} dB · region hidden until you submit
            </div>
            <audio ref={audioRef} src={round.dataUri} preload="auto" />
            <div className="flex gap-4 items-center mb-[10px] flex-wrap mt-3">
              <Button
                variant="secondary"
                onClick={playAudio}
                disabled={phase !== 'listening' || listens >= MAX_LISTENS || isPlaying}
              >
                {isPlaying ? 'Playing…' : listens === 0 ? <><Play className="size-4" />Play</> : 'Played'}
              </Button>
            </div>
            <div className="flex gap-4 items-center mb-[10px] flex-wrap mt-3">
              <Label htmlFor="guess" className="min-w-[90px]">Your guess</Label>
              <Input
                id="guess"
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value.toUpperCase())}
                className="flex-1 font-mono text-[18px] tracking-[2px]"
                disabled={phase !== 'listening'}
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && phase === 'listening' && guess.trim()) void submitGuess()
                }}
              />
              <Button
                variant="default"
                disabled={phase !== 'listening' || !guess.trim() || listens === 0}
                onClick={submitGuess}
              >
                {phase === 'guessing'
                  ? <><Loader2 className="animate-spin size-4" /> Grading…</>
                  : <><Send className="size-4" />Submit</>}
              </Button>
            </div>
            {phase === 'listening' && listens === 0 && (
              <div className="text-muted-foreground text-[13px]">
                Hit Play to hear the clip — it sends the callsign twice.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === 'graded' && round && botResult && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-[14px]">
              <Target className="size-4" />
              <span className="text-muted-foreground text-[13px]">Ground truth:</span>
              <span className="font-mono text-[20px] text-foreground tracking-[2px]">{round.text}</span>
              <Badge variant="secondary">{round.region}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <ResultCard title="You" guess={guess.toUpperCase().trim()} truth={round.text} cerPct={userCerPct!} />
              <ResultCard title="Bot" guess={botResult.text} truth={round.text} cerPct={botCerPct!} />
            </div>

            <div className="font-mono text-muted-foreground text-xs mt-[10px]">
              Bot two-look detail: 1st → {botResult.firstHalf.text || '(empty)'} (
              {(botResult.firstHalf.confidence * 100).toFixed(0)}%) · 2nd →{' '}
              {botResult.secondHalf.text || '(empty)'} (
              {(botResult.secondHalf.confidence * 100).toFixed(0)}%) ·{' '}
              {botResult.agreement ? 'agreement' : 'used higher-confidence half'}
            </div>

            <div className="mt-4">
              <Verdict userCer={userCerPct!} botCer={botCerPct!} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResultCard({ title, guess, truth, cerPct }: { title: string; guess: string; truth: string; cerPct: number }) {
  const maxLen = Math.max(guess.length, truth.length)
  const chars = []
  for (let i = 0; i < maxLen; i++) {
    const g = guess[i] ?? '·'
    const t = truth[i] ?? '·'
    chars.push(
      <span key={i} className={`font-mono ${g === t ? 'text-good' : 'text-bad font-bold'}`}>
        {g}
      </span>,
    )
  }
  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-[22px] text-foreground px-4 py-3 bg-[var(--code-bg)] rounded-md tracking-[2px] break-all min-h-[52px]">
          {chars.length ? chars : <span className="text-muted-foreground text-[13px]">(nothing)</span>}
        </div>
        <div className="text-muted-foreground text-[13px] mt-[6px]">
          CER: <span className={cerPct === 0 ? 'text-good' : ''}>{cerPct.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

function Verdict({ userCer, botCer }: { userCer: number; botCer: number }) {
  if (userCer < botCer) return (
    <span className="text-good flex items-center gap-2 text-[18px] font-semibold">
      <Trophy className="size-5" />You win this round.
    </span>
  )
  if (userCer > botCer) return (
    <span className="text-bad flex items-center gap-2 text-[18px] font-semibold">
      <X className="size-5" />Bot wins this round.
    </span>
  )
  return (
    <span className="text-foreground flex items-center gap-2 text-[18px] font-semibold">
      <Equal className="size-5" />Tie.
    </span>
  )
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: 'good' | 'bad'; icon?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground text-xs">{icon}{label}</div>
      <div className={`font-mono text-[22px] font-semibold ${accent === 'good' ? 'text-good' : accent === 'bad' ? 'text-bad' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  )
}
