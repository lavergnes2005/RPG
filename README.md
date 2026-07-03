# Chlora Quest

A tiny FF6-style RPG vertical slice: walk around an overworld, step into tall grass
to trigger a random encounter, and fight in a turn-based battle screen
(Attack / Fire / Potion / Run).

## Play it locally
Just open `index.html` in a browser, or run a local server:

```
cd rpg-game
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages (same flow as TrainerOS)

1. Create a new repo on GitHub (e.g. `chlora-quest`).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Initial vertical slice: overworld + battle"
   git branch -M main
   git remote add origin https://github.com/<your-username>/chlora-quest.git
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Source → Deploy from branch → main / (root)**.
4. Your game will be live at `https://<your-username>.github.io/chlora-quest/`.

## Add to Home Screen (PWA)

Once it's live on GitHub Pages (must be HTTPS — Pages is HTTPS by default):

- **iPhone**: open the URL in Safari → Share button → "Add to Home Screen"
- **Android**: open in Chrome → menu (⋮) → "Add to Home screen" / "Install app"

It'll launch full-screen like a native app, using the manifest and icons in this repo.

## Next steps to expand it
- Add more party members and a party-switch menu in battle
- Add a second map + a door/transition system between maps
- Add NPCs with dialogue boxes
- Add a shop and equipment/inventory system
- Swap the placeholder circles/rectangles for actual sprite art (Aseprite, itch.io asset packs, or generated art)
