---
id: hva-er-lora
kode: "1"
tittel: "Hva er LoRA: rank, alpha, target modules, QLoRA"
beskrivelse: "Lavrangs-adaptere, rank og alpha, hvilke lag du trener, og hvordan QLoRA får store modeller inn på et vanlig grafikkort."
nivåer: [lett, middels, vanskelig]
kilder:
  - tittel: "Hu m.fl. (2021): LoRA: Low-Rank Adaptation of Large Language Models"
    url: "https://arxiv.org/abs/2106.09685"
  - tittel: "Dettmers m.fl. (2023): QLoRA: Efficient Finetuning of Quantized LLMs"
    url: "https://arxiv.org/abs/2305.14314"
  - tittel: "Kalajdzievski (2023): A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA (rsLoRA)"
    url: "https://arxiv.org/abs/2312.03732"
  - tittel: "Kingma & Ba (2014): Adam: A Method for Stochastic Optimization"
    url: "https://arxiv.org/abs/1412.6980"
  - tittel: "Hugging Face PEFT: dokumentasjon"
    url: "https://huggingface.co/docs/peft/index"
  - tittel: "Hugging Face PEFT: LoRA (konseptguide)"
    url: "https://huggingface.co/docs/peft/conceptual_guides/lora"
  - tittel: "Hugging Face PEFT: LoraConfig (API-referanse)"
    url: "https://huggingface.co/docs/peft/package_reference/lora"
  - tittel: "bitsandbytes: dokumentasjon"
    url: "https://huggingface.co/docs/bitsandbytes/main/en/index"
  - tittel: "Hugging Face diffusers: LoRA-trening"
    url: "https://huggingface.co/docs/diffusers/training/lora"
  - tittel: "Unsloth: LoRA Hyperparameters Guide"
    url: "https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide"
oppdatert: "2026-11-18"
---

# Hva er LoRA: rank, alpha, target modules, QLoRA

**LoRA** står for **Low-Rank Adaptation**. Det er en metode for å tilpasse (finjustere) en ferdigtrent modell uten å endre de originale vektene. I stedet legger du små ekstra matriser ved siden av utvalgte lag, og så trener du bare dem.

Har du bakgrunn i dataelektronikk, kan du tenke på det slik: Basemodellen er en ferdig brent ROM. LoRA er en liten patch-krets som legges i parallell og korrigerer utgangen, mens ROM-en er urørt.

## 1. Motivasjon: full finjustering vs. PEFT

Et nevralt nettverk består i hovedsak av store vektmatriser. Et lineært lag regner ut $h = W x$, der $x$ er inngangsvektoren og $W$ er en matrise med lærte tall (vekter).

**Full finjustering** betyr at du trener *alle* vektene i modellen videre på dine egne data. Det er dyrt, fordi du for hver trenbare parameter må lagre

- selve vekten,
- gradienten (hvilken vei vekten skal justeres),
- optimizer-tilstand.

**Adam** (*Adaptive Moment Estimation*, Kingma & Ba 2014) er en optimeringsalgoritme. Den lagrer to glidende snitt per parameter, ett av gradienten og ett av den kvadrerte gradienten. Det er derfor den bruker 8 byte per parameter i fp32 (2 × 4 byte).

Med vanlig blandet presisjon og Adam blir dette omtrent **16 byte per parameter**: 2 (vekt i bf16) + 2 (gradient) + 4 (fp32-hovedkopi av vekten) + 8 (Adams to tilstander i fp32). For en modell med 7 milliarder parametre blir det $7 \cdot 10^9 \cdot 16 \approx 112$ GB, før aktiveringer er tatt med. Det får du ikke inn på et forbrukerkort.

**PEFT** (*Parameter-Efficient Fine-Tuning*) er samlenavnet på metoder som trener bare en liten del av parameterne. LoRA er den mest brukte. Hugging Face-biblioteket som implementerer dette heter også `peft`.

Med LoRA blir

- basemodellen **frosset** (ingen gradienter eller optimizer-tilstand for den),
- bare adapteren trent, typisk 0,1–1 % av parameterne,
- resultatet en liten adapterfil på noen MB til noen hundre MB, i stedet for en ny kopi av hele modellen på mange GB.

## 2. Matematikken

### Grunnideen

Under finjustering endres en vektmatrise fra $W_0$ til $W_0 + \Delta W$. Forfatterne av LoRA-artikkelen (Hu m.fl., 2021) observerte at endringen $\Delta W$ i praksis har lav **rang**. Den kan altså beskrives med langt færre tall enn hele matrisen.

Rang er et begrep fra lineær algebra: Rangen til en matrise er antall lineært uavhengige rader (eller kolonner). En matrise med lav rang er «enkel» og kan skrives som et produkt av to smale matriser.

LoRA tvinger derfor endringen til å være et slikt produkt:

$$\Delta W = B A$$

Hvis $W_0$ har form $d \times k$ (d utganger, k innganger), så er

- $A$ en $r \times k$-matrise (komprimerer inngangen ned til $r$ dimensjoner),
- $B$ en $d \times r$-matrise (ekspanderer tilbake til $d$ dimensjoner),
- $r \ll \min(d, k)$ det vi kaller **rank**.

Produktet $B A$ får formen $(d \times r)(r \times k) = d \times k$, altså samme form som $W_0$. Rangen til $BA$ kan aldri bli større enn $r$.

### Fremoverpasset med skalering

Utgangen fra et lag med LoRA blir

$$h = W_0 x + \frac{\alpha}{r} B A x$$

der $\alpha$ (**alpha**) er en konstant du velger. Den effektive vektmatrisen er altså

$$W = W_0 + \Delta W = W_0 + \frac{\alpha}{r} \cdot B A$$

$W_0$ er frosset. Bare $A$ og $B$ får gradienter og oppdateres.

Elektronikk-analogi: $A$ er en flaskehals (en smal buss på $r$ linjer), og $B$ fordeler signalet ut igjen. Alt adapteren skal lære, må passere gjennom de $r$ «linjene».

### Initialisering: hvorfor B = 0

Ved start initialiseres

- $A$ med små tilfeldige tall (Gauss-fordelt i artikkelen, Kaiming-uniform som standard i PEFT),
- $B$ med **nuller**.

Da er $\Delta W = B A = 0$ i første steg, og modellen oppfører seg *nøyaktig* som basemodellen når treningen starter. Det er trygt, fordi treningen begynner fra en modell som allerede fungerer.

Hvorfor ikke sette begge til null? Gradienten til $A$ inneholder $B$, og gradienten til $B$ inneholder $A x$. Er begge null, blir begge gradientene null, og ingenting lærer noe. Med $A$ tilfeldig og $B = 0$ får $B$ en gradient allerede i første steg, og så kommer $A$ etter.

### Regneeksempel: hvor mange parametre?

Ta en kvadratisk matrise på $4096 \times 4096$ (typisk størrelse for en attention-projeksjon i en 7B-modell).

| | Formel | Parametre | Andel av full |
|---|---|---|---|
| Full matrise | $4096 \cdot 4096$ | 16 777 216 | 100 % |
| LoRA, r = 8 | $r(d + k) = 8 \cdot (4096 + 4096)$ | 65 536 | 0,39 % |
| LoRA, r = 16 | $16 \cdot 8192$ | 131 072 | 0,78 % |

Generelt har en LoRA-adapter på en $d \times k$-matrise $r \cdot k + d \cdot r = r(d + k)$ parametre. Antallet vokser **lineært** med $r$, mens en full matrise vokser med $d \cdot k$.

For ikke-kvadratiske matriser fungerer det likt. MLP-laget `up_proj` i Llama-2-7B er $11008 \times 4096$, og med $r = 16$ gir det $16 \cdot (11008 + 4096) = 241\,664$ parametre.

## 3. Rank (r)

Rank bestemmer **kapasiteten** til adapteren: hvor mange «retninger» endringen kan ha.

- **Lav rank (4–16):** få parametre og lite VRAM. Ofte nok til stil, format og tonefall.
- **Høyere rank (32–128):** mer kapasitet, for eksempel for nytt fagstoff eller vanskeligere oppgaver. Men den bruker mer minne og overtilpasser seg lettere (pugger treningsdataene).

Et godt startpunkt er $r = 16$. Øk bare hvis modellen tydelig ikke klarer å lære det du vil. Mer data hjelper ofte mer enn høyere rank.

## 4. Alpha og skalering

$\alpha$ skalerer hvor sterkt adapteren virker. Skaleringsfaktoren er

$$s = \frac{\alpha}{r}$$

Eksempler:

| r | alpha | $s = \alpha / r$ |
|---|---|---|
| 8 | 8 | 1 |
| 8 | 16 | 2 |
| 16 | 32 | 2 |
| 64 | 16 | 0,25 |

Tommelfingerregler som brukes mye: $\alpha = r$ (s = 1) eller $\alpha = 2r$ (s = 2). Holder du forholdet fast når du endrer $r$, slipper du å justere læringsraten like mye.

Legg merke til at med fast $\alpha$ og økende $r$ blir $s$ *mindre*. Dobler du $r$ fra 16 til 32 med $\alpha = 16$, halveres $s$ fra 1 til 0,5.

**rsLoRA** (*rank-stabilized LoRA*, Kalajdzievski 2023) viste at $\alpha / r$ demper adapteren for mye ved høy rank, slik at høy rank lærer dårligere enn forventet. rsLoRA bruker i stedet

$$s = \frac{\alpha}{\sqrt{r}}$$

Med $r = 16$ og $\alpha = 16$ gir det $s = 16 / 4 = 4$ i stedet for 1. I PEFT slår du det på med `use_rslora=True`. Det er mest nyttig når du bruker høy rank (64+).

## 5. Target modules: hvilke lag får adapter?

En transformer-blokk i en språkmodell (f.eks. Llama, Mistral, Qwen) har to hoveddeler med lineære lag:

**Attention (oppmerksomhet):**

- `q_proj`: query, «hva leter dette ordet etter?»
- `k_proj`: key, «hva tilbyr dette ordet?»
- `v_proj`: value, «hvilken informasjon sendes videre?»
- `o_proj`: output, setter resultatene sammen igjen

**MLP (feed-forward):**

- `gate_proj`, `up_proj`: ekspanderer til en større dimensjon (f.eks. 4096 → 11008)
- `down_proj`: komprimerer tilbake (11008 → 4096)

Navnene varierer mellom arkitekturer. GPT-2 bruker for eksempel `c_attn`, og diffusjonsmodeller bruker `to_q`, `to_k`, `to_v`, `to_out.0`.

Typiske valg:

| Valg | Effekt |
|---|---|
| `q_proj`, `v_proj` | Originalartikkelens standard. Billigst, minst kapasitet. |
| Alle attention-lag (q, k, v, o) | Mer kapasitet, fortsatt billig. |
| `"all-linear"` (attention + MLP) | Anbefales i QLoRA-artikkelen og av Unsloth. Gir best kvalitet, særlig med lav rank. |

I PEFT kan du skrive `target_modules="all-linear"`, så finner biblioteket alle lineære lag unntatt utgangslaget selv.

Regneeksempel (Llama-2-7B: 32 lag, skjult dimensjon 4096, MLP-dimensjon 11008):

- `q_proj` + `v_proj`, $r = 8$: $32 \cdot 2 \cdot 65\,536 = 4\,194\,304 \approx 4{,}2$ millioner parametre.
- `all-linear`, $r = 16$: per lag $4 \cdot 16 \cdot 8192 + 3 \cdot 16 \cdot (4096 + 11008) = 1\,249\,280$, og totalt $32 \cdot 1\,249\,280 = 39\,976\,960 \approx 40$ millioner, omtrent 0,59 % av modellens 6,74 milliarder.

## 6. Dropout

`lora_dropout` setter tilfeldige elementer i inngangen *til adapteren* til null under trening (med en sannsynlighet $p$, f.eks. 0,05–0,1). Det er en regulariseringsteknikk som gjør det vanskeligere å pugge treningsdataene, slik at modellen generaliserer bedre. Den påvirker bare LoRA-grenen, ikke basemodellen, og er avslått ved inferens.

Med mye data eller korte treninger setter mange $p = 0$. Unsloth anbefaler 0 fordi det gir raskere trening. Har du lite data og ser tegn til overtilpasning, kan du prøve 0,05–0,1.

## 7. QLoRA: LoRA på en kvantisert modell

Selv om LoRA sparer minne på trening, må basemodellen fortsatt ligge i VRAM. En 7B-modell i bf16 (2 byte per vekt) tar ca. $7 \cdot 10^9 \cdot 2 = 14$ GB. **QLoRA** (Dettmers m.fl., 2023) løser det ved å lagre den frosne basemodellen i **4 bit**, mens adapteren trenes i 16 bit. Gradientene flyter gjennom de kvantiserte vektene (de dekvantiseres fortløpende til bf16 for hver matrisemultiplikasjon), men oppdaterer bare $A$ og $B$.

QLoRA har tre nøkkelideer:

**1. NF4 (4-bit NormalFloat).** Kvantisering betyr å representere tall med færre bit, akkurat som en ADC som runder av en analog spenning til et begrenset antall nivåer. Med 4 bit har du $2^4 = 16$ nivåer. Vekter i nevrale nett er omtrent normalfordelt (de fleste nær null), så NF4 plasserer de 16 nivåene tettest der vektene faktisk ligger, i stedet for jevnt. Det gir mindre kvantiseringsfeil enn vanlig 4-bit heltall eller 4-bit flyttall. 4 bit = 0,5 byte, så en 7B-modell tar ca. 3,5 GB.

**2. Dobbel kvantisering.** Vektene kvantiseres i blokker på 64. Hver blokk trenger en skaleringskonstant (fp32, 32 bit). Det koster $32 / 64 = 0{,}5$ bit ekstra per vekt. QLoRA kvantiserer også *disse konstantene* til 8 bit, i blokker på 256, med én fp32-konstant per blokk. Da blir overheaden

$$\frac{8}{64} + \frac{32}{64 \cdot 256} \approx 0{,}127 \ \text{bit per vekt}$$

Besparelsen er altså ca. 0,373 bit per vekt, som tilsvarer ca. 3 GB på en 65B-modell.

**3. Paged optimizers.** Under trening kan minnebruken få korte topper (f.eks. ved lange sekvenser). Paged optimizers bruker NVIDIAs *unified memory* til å flytte optimizer-tilstanden automatisk mellom GPU og CPU-RAM, på samme måte som et operativsystem bytter sider til disk. Dermed krasjer ikke treningen med «out of memory» ved en enkelt topp.

QLoRA-artikkelen viste at denne kombinasjonen gir omtrent samme kvalitet som 16-bit finjustering, og at en 65B-modell kan finjusteres på ett 48 GB-kort.

### Grovt VRAM-estimat

Du kan lage et grovt overslag ved å legge sammen:

1. **Basemodellens vekter:** parametre × byte per vekt (2 for bf16, ca. 0,5 for NF4).
2. **Adapteren med gradient og Adam:** trenbare parametre × ca. 16 byte (fp32 vekt 4 + gradient 4 + Adam 8).
3. **Aktiveringer:** avhenger av sekvenslengde og batchstørrelse. Typisk 1–4 GB med *gradient checkpointing* og korte sekvenser (ca. 2048 tokens, batch 1).
4. **CUDA-kontekst og fragmentering:** typisk 0,5–1 GB.

Eksempel, 8B-modell med QLoRA og 40 millioner adapterparametre: $4 + 0{,}64 + 2 + 0{,}7 \approx 7{,}3$ GB.

### Hva passer på hvilket kort?

Grove anslag med batch 1, korte sekvenser (ca. 2k tokens) og gradient checkpointing. Verktøy som Unsloth kan presse tallene ned, og lengre kontekst drar dem opp.

| VRAM | LLM med QLoRA (4-bit) | LLM med LoRA (16-bit base) | Bildemodeller (LoRA) |
|---|---|---|---|
| 8 GB | 7–8B går, men trangt | opptil ca. 1–3B | SD 1.5 greit, SDXL med triks (8-bit Adam, checkpointing) |
| 12 GB | 7–8B komfortabelt, ca. 12–14B trangt | opptil ca. 3–4B | SDXL greit, Flux bare med kvantisert base og offloading |
| 16 GB | opptil ca. 14B | opptil ca. 7B, trangt | SDXL komfortabelt, Flux med 8-bit/NF4-base |
| 24 GB | opptil ca. 30–34B | 7–8B | Flux komfortabelt |

*Merk for Arch/Omarchy:* `bitsandbytes`, som QLoRA bygger på, er mest moden på NVIDIA (CUDA). Det finnes ROCm-støtte for AMD, men den er mindre utprøvd. Paged optimizers er knyttet til CUDA unified memory.

## 8. Merging vs. separat adapter

Etter trening har du to valg:

**Separat adapter:** Du beholder basemodellen og adapterfilen hver for seg og laster dem sammen ved inferens.

- Liten fil, lett å dele.
- Du kan bytte mellom mange adaptere på samme basemodell, eller kombinere flere.
- Det koster litt ekstra regning, fordi $BAx$ må regnes ut i tillegg.

**Merging (sammenslåing):** Du regner ut $W = W_0 + \frac{\alpha}{r} B A$ én gang og lagrer resultatet som en vanlig modell (`merge_and_unload()` i PEFT).

- Ingen ekstra forsinkelse ved inferens. Modellen er like rask som originalen.
- Den kan konverteres til f.eks. GGUF for llama.cpp eller Ollama.
- Men da får du en full kopi av modellen (mange GB), og adapteren kan ikke lenger slås av.

Med QLoRA er basen 4-bit. For å merge må du derfor laste basemodellen i 16 bit (eller dekvantisere) og legge adapteren på der. Merger du direkte inn i 4-bit-vektene, får du en ekstra avrundingsfeil.

## 9. Språkmodell vs. bildemodell

Prinsippet er det samme: frys basen og tren $B A$ ved siden av lineære lag.

| | Språkmodell (LLM) | Bildemodell (SD 1.5 / SDXL / Flux) |
|---|---|---|
| Typiske data | Hundrevis til tusenvis av tekstpar (instruks → svar) | 15–50 bilder med bildetekster |
| Hva læres | Stil, format, tonefall, fagområde | Person, figur, objekt, kunststil |
| Target modules | `q/k/v/o_proj`, MLP, `all-linear` | Attention i UNet (SD/SDXL) eller transformer (Flux): `to_q`, `to_k`, `to_v`, `to_out.0` |
| Typisk rank | 8–64 | 4–32 (Flux ofte 16–64) |
| Verktøy | PEFT + TRL, Unsloth, Axolotl | diffusers, kohya_ss / sd-scripts, ai-toolkit |

Bildemodeller bruker ofte et **triggerord** i bildetekstene (f.eks. «wimstyle»), slik at adapteren aktiveres når ordet står i prompten.

## 10. Minimalt kodeeksempel (PEFT)

Dette eksempelet laster en modell i 4 bit (QLoRA) og legger på en LoRA-adapter. Det viser oppsettet, ikke en hel treningsløkke.

```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# QLoRA: last basemodellen i 4-bit NF4 med dobbel kvantisering
bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-0.5B",   # liten modell for å teste oppsettet
    quantization_config=bnb,
    device_map="auto",
)
model = prepare_model_for_kbit_training(model)

config = LoraConfig(
    r=16,                         # rank
    lora_alpha=32,                # alpha -> skalering 32/16 = 2
    target_modules="all-linear",  # eller ["q_proj", "k_proj", "v_proj", "o_proj"]
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    # use_rslora=True,            # skalering alpha/sqrt(r) i stedet for alpha/r
)

model = get_peft_model(model, config)
model.print_trainable_parameters()
# -> trainable params: ... || all params: ... || trainable%: ...
```

Installasjon i et virtuelt miljø på Arch:

```bash
python -m venv ~/venv/lora && source ~/venv/lora/bin/activate
pip install torch transformers peft bitsandbytes accelerate
```

Treningen gjøres deretter typisk med `SFTTrainer` fra `trl`. Paged optimizer velger du med `optim="paged_adamw_8bit"` i treningsargumentene. Etter trening lagrer `model.save_pretrained("min-adapter")` bare adapteren (filen `adapter_model.safetensors`).

## Oppsummering

- LoRA fryser $W_0$ og trener $\Delta W = B A$, med $B$: $d \times r$ og $A$: $r \times k$.
- Antall parametre er $r(d + k)$. For $4096 \times 4096$ og $r = 16$ blir det 131 072 (0,78 %).
- $B$ starter som 0, så modellen starter identisk med basen.
- Skalering $s = \alpha / r$ (rsLoRA: $\alpha / \sqrt{r}$).
- Target modules velger hvilke lag som får adapter. `all-linear` gir mest kvalitet.
- QLoRA = 4-bit NF4-base + dobbel kvantisering + paged optimizers + LoRA i 16 bit.
- Adapteren kan lagres separat (liten og fleksibel) eller merges inn (raskere inferens).
