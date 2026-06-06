import { useEffect, useRef, useState } from 'react'
import { decodeDataUri, type PipelineResult } from '../inference/pipeline'
import { cer } from '../inference/decode'
import { loadSession } from '../inference/onnx'
import { generateAudio } from '../inference/generate'
import { Activity, AudioLines, Cpu, Gauge, Loader2, Play, Radio, Shuffle, TriangleAlert, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

const TONE_FREQ = 700

function randomText(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function DecodePage() {
  const [text, setText] = useState(() => randomText(8))
  const [wpm, setWpm] = useState(25)
  const [snr, setSnr] = useState(6)
  const [qsb, setQsb] = useState(false)

  const [dataUri, setDataUri] = useState<string | null>(null)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadSession()
      .then(() => setModelReady(true))
      .catch((e) => setError(String(e)))
  }, [])

  async function onGenerate() {
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const out = generateAudio({ text, wpm, snrDb: snr, frequency: TONE_FREQ, qsb })
      setDataUri(out.dataUri)
      const decoded = await decodeDataUri(out.dataUri, TONE_FREQ)
      setResult(decoded)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Radio className="size-6" />
        <h1 className="text-[28px] font-semibold text-foreground tracking-[-0.4px] m-0">Decode Demo</h1>
      </div>
      <p className="mb-3">
        Generate a morse code clip at any speed and SNR, listen to it, and see what the model decodes.
        Model:{' '}
        <code className="text-sm px-1.5 py-0.5 rounded-sm bg-[var(--code-bg)] text-foreground font-mono">CWNet</code>
        {' '}(808k params, 3.1 MB ONNX) running in your browser via onnxruntime-web.
      </p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Generate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center mb-[10px] flex-wrap">
            <Label htmlFor="text" className="min-w-[90px]">Text</Label>
            <Input
              id="text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              className="flex-1 font-mono"
              maxLength={40}
            />
            <Button variant="secondary" onClick={() => setText(randomText(8))} type="button">
              <Shuffle className="size-4" />Random
            </Button>
          </div>
          <div className="flex gap-4 items-center mb-[10px] flex-wrap">
            <Gauge className="size-4" />
            <Label className="min-w-[90px]">WPM</Label>
            <Slider min={12} max={50} value={[wpm]} onValueChange={([n]) => setWpm(n)} className="flex-1" />
            <span className="font-mono text-foreground min-w-[60px] text-right">{wpm}</span>
          </div>
          <div className="flex gap-4 items-center mb-[10px] flex-wrap">
            <Activity className="size-4" />
            <Label className="min-w-[90px]">SNR (dB)</Label>
            <Slider min={-15} max={20} value={[snr]} onValueChange={([n]) => setSnr(n)} className="flex-1" />
            <span className="font-mono text-foreground min-w-[60px] text-right">{snr}</span>
          </div>
          <div className="flex gap-4 items-center mb-[10px] flex-wrap">
            <Waves className="size-4" />
            <Label htmlFor="qsb" className="min-w-[90px]">QSB (fading)</Label>
            <Switch id="qsb" checked={qsb} onCheckedChange={setQsb} />
            <span className="text-muted-foreground text-[13px]">Moderate signal fading, 0.2 Hz rate</span>
          </div>
          <div className="flex gap-4 items-center mb-[10px] flex-wrap">
            <Button variant="default" disabled={busy || !modelReady || !text.trim()} onClick={onGenerate}>
              {busy
                ? <><Loader2 className="animate-spin size-4" /> Decoding…</>
                : <><Play className="size-4" />Generate &amp; decode</>}
            </Button>
            {!modelReady && (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                <Loader2 className="animate-spin size-4" /> Loading model…
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1 text-bad font-mono">
                <TriangleAlert className="size-4" /> {error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {dataUri && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle><AudioLines className="size-5" />Audio</CardTitle>
          </CardHeader>
          <CardContent>
            <audio ref={audioRef} src={dataUri} controls className="w-full" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle><Cpu className="size-5" />Model output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-[22px] text-foreground px-4 py-3 bg-[var(--code-bg)] rounded-md tracking-[2px] break-all min-h-[52px]">
              {result.text || <span className="text-muted-foreground text-[13px]">(no output)</span>}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3 text-[13px]">
              <Stat label="CER" value={(cer(text, result.text) * 100).toFixed(1) + '%'} />
              <Stat label="Confidence" value={(result.confidence * 100).toFixed(0) + '%'} />
              <Stat label="Inference" value={result.timing.modelMs.toFixed(0) + ' ms'} />
              <Stat label="Total" value={result.timing.totalMs.toFixed(0) + ' ms'} />
            </div>
            <div className="text-muted-foreground text-[13px] mt-[10px]">
              Audio decode {result.timing.audioMs.toFixed(0)} ms · DSP {result.timing.dspMs.toFixed(0)} ms · CTC {result.timing.decodeMs.toFixed(0)} ms
            </div>
            <div className="mt-[14px]">
              <span className="text-muted-foreground text-[13px]">Ground truth:&nbsp;</span>
              <DiffLine ref_={text} hyp={result.text} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-md px-[10px] py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-foreground font-mono text-[15px]">{value}</div>
    </div>
  )
}

function DiffLine({ ref_, hyp }: { ref_: string; hyp: string }) {
  const maxLen = Math.max(ref_.length, hyp.length)
  const chars = []
  for (let i = 0; i < maxLen; i++) {
    const r = ref_[i] ?? '·'
    const h = hyp[i] ?? '·'
    chars.push(
      <span key={i} className={`font-mono ${r === h ? 'text-good' : 'text-bad font-bold'}`}>
        {r}
      </span>,
    )
  }
  return <span>{chars}</span>
}
