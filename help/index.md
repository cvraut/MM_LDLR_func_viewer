# About this browser

This page is written in `help/index.md`. Edit it to describe your project, your data and how to read the tracks. Everything here is plain [Markdown](https://commonmark.org/help/), turned into HTML when you run `npm run build`.

The demo tracks in the viewer are **synthetic**: random numbers shaped to look like a typical screen. Replace them with your own files.

## Reading a track

Each signal track has a name, a y-axis with its range, and a title for the units. Peaks or hits called from that signal sit directly underneath in the same color.

![Anatomy of a signal track](images/track-anatomy.svg "Figure 1. A signal track with its y-axis and the peaks track below it.")

<div class="only-mouse">
Click any track name in the viewer to jump to its section below. The [SPRn section](#track-demo_sprn) is an example.
</div>

<div class="only-touch">
Tap any track name in the viewer to jump to its section below. The [SPRn section](#track-demo_sprn) is an example.
</div> 

## Getting around

<div class="only-mouse">

| Do this | To |
| --- | --- |
| Scroll sideways (trackpad) or shift + scroll | Move along the chromosome |
| Alt / option + scroll over the tracks | Zoom in or out around the pointer |
| Drag across the tracks | Zoom to the region you selected |
| Double-click | Zoom out 3× around the pointer |
| Type in the position box | Jump to `chr19:11,089,082-11,092,493` |
| Zoom slider, top right | Zoom from a whole chromosome down to single bases |
| ← / → keys | Move 10% left or right |

</div>

<div class="only-touch">

| Do this | To |
| --- | --- |
| Swipe sideways on the tracks | Move along the chromosome |
| Two fingers on the tracks, then lift | Zoom to the region between them |
| Touch and hold on the tracks | Show values (like hovering) |
| Tap the track name | Track options, including *About this track* |
| Tap left of the tracks, then the red × | Hide the track |
| Hold left of the tracks for half a second, then drag | Reorder |

</div>

At the highest zoom the sequence track shows individual bases.

## Arranging tracks

<div class="only-mouse">

- **Reorder:** drag anywhere in the track's left area, up or down.
- **Hide:** hover a track name and click ×. Hidden tracks wait in the *Hidden tracks* tray under the viewer.
- **Bring back:** click a track in the tray to add it back, or drag it to the exact place you want. bed and bedGraph tracks will add close to their corresponding tracks instead of at the bottom.
- **Display options:** click a track name to change how it is drawn.

</div>

<div class="only-touch">

- **Reorder:** tap and hold anywhere in the track's left area, then drag up or down.
- **Hide:** tap track name and tap the red ×. Hidden tracks wait in the *Hidden tracks* tray under the viewer.
- **Bring back:** tap a track in the tray to add it back, or drag it to the exact place you want. bed and bedGraph tracks will add close to their corresponding tracks instead of at the bottom.
- **Display options:** tap a track name to change how it is drawn.

</div>

Your arrangement is remembered in this browser. **Reset view** in the toolbar restores the original layout and position.

## CRISPR enrichment and depletion diagram

![Schematic of the CRISPR tracks](images/crispr_fig.png "Figure 2: Graphical overview for the CRISPRn/i/a tracks")