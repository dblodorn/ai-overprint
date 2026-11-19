# ai-overprint

An Illustrator script that gives the selected group, path or text frame the
ink-spread look from [Mark Hurrell's overprint generator](https://thinkmake.github.io/overprinter.markhurrell.com/).
The result stays as **live vector effects**, so it can still be edited in the
Appearance panel.

## How it works

The site uses `filter: blur(D em)` followed by an SVG `feFuncA` table that
hard-thresholds alpha. Blurring and then thresholding rounds the corners and
fills ink traps. The **Overprint** slider moves the threshold, which makes the
shape heavier or lighter.

This script gets close to that with a stack of effects:

```
Pathfinder Add -> Offset Path +r -> Offset Path -2r -> Offset Path +r+bias   (round joins)
```

- sigma = Deterioration x Reference (pt)
- r = 1.5 x sigma
- bias = sigma x (Overprint - 50) / 25

The multipliers are `RADIUS_PER_SIGMA` and `BIAS_PER_SIGMA_PER_POINT` at the
top of `src/overprint.ts`.

## Use

1. In Illustrator, select one or more groups, paths or text frames.
2. Go to File > Scripts > Other Script... and pick `dist/overprint.jsx`. To get
   a menu entry instead, copy the file into
   `/Applications/Adobe Illustrator <version>/Presets/<locale>/Scripts/` and
   restart Illustrator.
3. Set the controls:
   - **Deterioration**: 0 to 0.15, default 0.04. Same range as the site.
   - **Overprint**: 2 to 98, default 67.
   - **Reference (pt)**: the size of 1em. For a text frame this defaults to
     the font size; otherwise it defaults to the selection's height. For
     outlined type, set it to the original point size.
   - **Merge overlapping shapes**: on by default. Adds Effect > Pathfinder > Add before the offsets so overlapping shapes merge.
   - **Preview**: shows the result on a temporary duplicate.
4. Click OK to apply the effects to the original. To get real paths, use
   Object > Expand Appearance.

## Build

```
npm install
npm run build   # src/overprint.ts -> dist/overprint.jsx (ES3 ExtendScript)
```
