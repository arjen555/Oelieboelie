// Oelieboelie – gedeelde code van spel en editor
// =====================================================================
// OBJECTEN: kant-en-klare stukken die je in de editor in een level zet
// (v1.61) Dit bestand wordt door het spel (index.html) én de editor (editor.html) gebruikt.
// Een nieuw object of decor hoeft dus maar op één plek: hier. (In de editor daarnaast nog
// in het objectenmenu OBJ_MENU en in labelVan.)
// =====================================================================
// In het levelbestand staat een object als { soort, maat, stand, richting, x, y }.
// x en y = de linkerbovenhoek, in blokjes. Ter vergelijking: een oelieboelie is 6 blokjes hoog.
const OBJ_LENGTES = { kort: 8, middel: 16, lang: 24 };   // balk en plank
function objectMaat(o){   // breedte (b) en hoogte (h) in blokjes
  if(o.soort === 'schuin') return { b: o.b, h: o.h };   // een gekantelde balk (ontstaat alleen in het spel, door Bomby)
  const sm = spulMaat(o); if(sm) return sm;
  if(o.soort === 'boog')      return o.maat === 'groot' ? { b:25, h:20 } : { b:15, h:12 };
  if(o.soort === 'helling')   return o.maat === 'steil' ? { b:6, h:12 } : { b:16, h:8 };
  if(o.soort === 'balk'){ const l = OBJ_LENGTES[o.maat] || 16; return o.stand === 'verticaal' ? { b:2, h:l } : { b:l, h:2 }; }
  if(o.soort === 'plank')     return { b: OBJ_LENGTES[o.maat] || 16, h:1 };
  if(o.soort === 'parachute') return { b:4, h:5 };
  if(o.soort === 'drukplaat') return { b:4, h:1 };   // (v1.71) ontstekingsmechanisme: platte plaat op de grond
  return { b:1, h:1 };
}
// de parachute is geen bouwvorm: je loopt erdoorheen. Van de spullen is alleen de kist vast (je staat erop);
// boom, put, hond en cactus werken met een eigen stuk waar de o's tegenaan lopen, en decor doet niets.
const objectIsVast = o => o.soort !== 'parachute' && o.soort !== 'drukplaat' && !isDecor(o) && (!isDing(o) || o.soort === 'kist' || !!STEVIG[o.soort]);
// De vorm van een object, in spelpixels. Deze vorm wordt getekend, en in het spel bepaalt hij ook
// welke blokjes 'vast' worden (een blokje telt mee als zijn midden binnen de vorm valt).
function objectPad(o){
  const m = objectMaat(o), x = o.x*BLOK, y = o.y*BLOK, b = m.b*BLOK, h = m.h*BLOK, p = new Path2D();
  if(o.soort === 'boog'){
    // vorm zoals Arjens tekening (boog.png): de opening is 52% van de breedte, met rechte zijkanten
    // tot halverwege de hoogte en daarboven een halve ellips
    const onder = y + h, hoek = 0.06*b, ox = x + 0.231*b, ob = 0.526*b, r = ob/2, ry = 0.25*h, recht = 0.5*h;
    p.moveTo(x, onder); p.lineTo(x, y + hoek); p.quadraticCurveTo(x, y, x + hoek, y);
    p.lineTo(x + b - hoek, y); p.quadraticCurveTo(x + b, y, x + b, y + hoek); p.lineTo(x + b, onder);
    p.lineTo(ox + ob, onder); p.lineTo(ox + ob, onder - recht);
    p.ellipse(ox + r, onder - recht, r, ry, 0, 0, Math.PI, true);
    p.lineTo(ox, onder); p.closePath();
  } else if(o.soort === 'helling'){
    // richting 1 = loopt omhoog naar rechts, -1 = omhoog naar links
    p.moveTo(x, y + h); p.lineTo(x + b, y + h);
    if(o.richting === -1) p.lineTo(x, y); else p.lineTo(x + b, y);
    p.closePath();
  } else if(o.soort === 'schuin'){
    o.hoeken.forEach(([hx, hy], i) => i ? p.lineTo(hx, hy) : p.moveTo(hx, hy)); p.closePath();
  } else if(o.soort === 'parachute' || o.soort === 'drukplaat' || isDing(o) || isDecor(o)){
    p.rect(x, y, b, h);
  } else {
    const r = Math.min(2.5, h/3, b/3);   // balk en plank: rechthoek met zachte hoekjes
    p.moveTo(x + r, y); p.lineTo(x + b - r, y); p.quadraticCurveTo(x + b, y, x + b, y + r);
    p.lineTo(x + b, y + h - r); p.quadraticCurveTo(x + b, y + h, x + b - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
  }
  return p;
}
// De hoogte (y) van het schuine vlak van een helling, op plek x (in spelpixels)
function hellingOppervlak(o, x){
  if(o.soort === 'schuin'){   // gekantelde balk: de bovenkant is een schuine lijn
    const [a, b] = o.boven, f = Math.max(0, Math.min(1, (x - a[0])/Math.max(1, b[0] - a[0])));
    return a[1] + (b[1] - a[1])*f;
  }
  const m = objectMaat(o), x0 = o.x*BLOK, b = m.b*BLOK, onder = (o.y + m.h)*BLOK;
  let f = Math.max(0, Math.min(1, (x - x0)/b));
  if(o.richting === -1) f = 1 - f;
  return onder - f*m.h*BLOK;
}
// ---- Tekenen ----
// Arjens tekeningen (getekend met ChatGPT, bijgesneden en verkleind). Zolang een plaatje nog niet
// geladen is, tekenen we een nette grijze vorm.
const OBJ_BRON = {"boog": "plaatjes/boog.webp", "balk": "plaatjes/balk.webp", "plank": "plaatjes/plank.webp", "parachute_pakket": "plaatjes/parachute_pakket.webp", "parachute_rugzak": "plaatjes/parachute_rugzak.webp", "parachute_open": "plaatjes/parachute_open.webp"};
Object.assign(OBJ_BRON, {"boom": "plaatjes/boom.webp", "put": "plaatjes/put.webp", "kist": "plaatjes/kist.webp", "hond": "plaatjes/hond.webp", "cactus": "plaatjes/cactus.webp", "leeglopen": "plaatjes/leeglopen.webp", "molenkern": "plaatjes/molenkern.webp", "molenkruis": "plaatjes/molenkruis.webp", "huis": "plaatjes/huis.webp", "struik1": "plaatjes/struik1.webp", "struik2": "plaatjes/struik2.webp", "struik3": "plaatjes/struik3.webp", "lantaarn": "plaatjes/lantaarn.webp", "bank": "plaatjes/bank.webp"});
Object.assign(OBJ_BRON, {"boeken": "plaatjes/boeken.webp", "blokken": "plaatjes/blokken.webp", "stronk": "plaatjes/stronk.webp", "ton": "plaatjes/ton.webp", "cadeau": "plaatjes/cadeau.webp", "theepot": "plaatjes/theepot.webp"});
Object.assign(OBJ_BRON, {"boom_spar": "plaatjes/boom_spar.webp", "boom_appel": "plaatjes/boom_appel.webp", "boom_berk": "plaatjes/boom_berk.webp", "vogelverschrikker": "plaatjes/vogelverschrikker.webp", "wegwijzer": "plaatjes/wegwijzer.webp", "brievenbus": "plaatjes/brievenbus.webp", "vogelhuisje": "plaatjes/vogelhuisje.webp", "kruiwagen": "plaatjes/kruiwagen.webp"});
Object.assign(OBJ_BRON, {"ufo": "plaatjes/ufo.webp", "struisvogel_staan": "plaatjes/struisvogel_staan.webp", "struisvogel_pik": "plaatjes/struisvogel_pik.webp", "struisvogel_kijk": "plaatjes/struisvogel_kijk.webp", "glijbaan": "plaatjes/glijbaan.webp", "molentje_stok": "plaatjes/molentje_stok.webp", "molentje_wiel": "plaatjes/molentje_wiel.webp", "banaan": "plaatjes/banaan.webp"});
Object.assign(OBJ_BRON, {"f1": "plaatjes/f1.webp", "racefiets": "plaatjes/racefiets.webp", "voetbal": "plaatjes/voetbal.webp", "tablet": "plaatjes/tablet.webp", "stoommachine": "plaatjes/stoommachine.webp", "vliegwiel": "plaatjes/vliegwiel.webp"});   // items2.png (v0.99)
Object.assign(OBJ_BRON, {"ridder": "plaatjes/ridder.webp", "koe": "plaatjes/koe.webp", "hart": "plaatjes/hart.webp", "vlag1": "plaatjes/vlag1.webp", "vlag2": "plaatjes/vlag2.webp", "vlag3": "plaatjes/vlag3.webp"});   // items3.png (v1.3)
Object.assign(OBJ_BRON, {"betonmolen": "plaatjes/betonmolen.webp", "bouwvakker": "plaatjes/bouwvakker.webp", "kraan": "plaatjes/kraan.webp", "hangmat": "plaatjes/hangmat.webp", "ruimtemannetje": "plaatjes/ruimtemannetje.webp"});   // items4.png (v1.13)
// ---- Spullen in het landschap (v0.67) ----
// DINGEN: daar reageren de o's op (scherp, met een schaduwplekje op de grond).
// DECOR: achtergrond, de o's lopen erlangs (vervaagd, lichter en blauwiger, en de voet zakt achter de graslijn).
// Een ding is altijd een ding en decor is altijd decor: zo leert de speler het maar één keer.
const DINGEN = ['boom', 'put', 'kist', 'hond', 'cactus', 'boeken', 'blokken', 'stronk', 'ton', 'cadeau', 'theepot'];
// Stevige spullen (v0.89, interactief.png): vast blok. Ertegenaan lopen = omdraaien; erop vallen = erop landen, eroverheen lopen en er weer af.
// b x h = het stevige blok in blokjes. boven = het deel van het plaatje dat boven dat blok uitsteekt en alleen getekend wordt
// (hengsel van de ton, knopje van de theepot, strik van het cadeau): daar lopen de o's gewoon langs.
const STEVIG = { boeken: { b:8,  h:7,  boven:0.03 }, blokken: { b:6,  h:6,  boven:0 },    stronk:  { b:12, h:8,  boven:0.04 },
                 ton:    { b:13, h:12, boven:0.10 }, cadeau:  { b:10, h:8,  boven:0.29 }, theepot: { b:9,  h:11, boven:0.16, midden:0.47 } };
// (v1.12) theepot: alleen de buik is vast (9 breed); tuit, oor en het rechterstuk van het kopje worden alleen getekend.
// midden = waar het midden van het vaste blok in het plaatje zit (0.47 = net links van het midden van het plaatje)
Object.assign(OBJ_BRON, {"planeetplant": "plaatjes/planeetplant.webp", "raketje": "plaatjes/raketje.webp", "kristal": "plaatjes/kristal.webp"});   // (v1.56) decor voor de vreemde planeet (planeetplant.png, raketje.png, kristal.png)
Object.assign(OBJ_BRON, {"duiveltje": "plaatjes/duiveltje.webp", "zweefmolen": "plaatjes/zweefmolen.webp", "borstbeeld": "plaatjes/borstbeeld.webp", "beestje": "plaatjes/beestje.webp"});   // (v1.74) decor uit items6.png
const DECOR = ['molen', 'huis', 'struik', 'lantaarn', 'bank', 'vogelverschrikker', 'wegwijzer', 'brievenbus', 'vogelhuisje', 'kruiwagen',
               'ufo', 'struisvogel', 'glijbaan', 'molentje', 'banaan',    // v0.81 (items.png)
               'f1', 'racefiets', 'voetbal', 'tablet', 'stoommachine',    // v0.99 (items2.png)
               'ridder', 'vlag', 'koe', 'hart',                           // v1.3 (items3.png)
               'betonmolen', 'bouwvakker', 'kraan', 'hangmat', 'ruimtemannetje',
               'planeetplant', 'raketje', 'kristal',                      // v1.56 (vreemde planeet)
               'duiveltje', 'zweefmolen', 'borstbeeld', 'beestje',        // v1.74 (items6.png)
               'rook'];   // v1.29: rookpluim (geen plaatje, alleen rook)   // v1.13 (items4.png)
const isDing = o => DINGEN.includes(o.soort), isDecor = o => DECOR.includes(o.soort);

// (v1.35) kisten mogen op elkaar staan. Het plaatje van een kist steekt een blokje boven zijn vaste deel uit:
// teken daarom eerst de onderste kisten, dan valt de bovenste kist mooi een stukje over de onderste heen.
function kistenOpVolgorde(lijst){
  const kisten = lijst.filter(o => o.soort === 'kist').sort((a, b) => b.y - a.y);
  let i = 0;
  return lijst.map(o => o.soort === 'kist' ? kisten[i++] : o);
}
// drie extra bomen (v0.74): werken precies als de gewone boom. zone = het stuk stam waar de o's tegenaan lopen (links, rechts, bovenkant)
const BOMEN = { spar: { b:15, h:26, img:'boom_spar', zone:[0.37, 0.64, 0.45] }, appel: { b:22, h:22, img:'boom_appel', zone:[0.37, 0.64, 0.45] },
                berk: { b:19, h:25, img:'boom_berk', zone:[0.40, 0.62, 0.45] } };
const STRUISVOGELS = { staan: { b:6, h:12, img:'struisvogel_staan' }, pik: { b:7, h:9, img:'struisvogel_pik' },
                      kijk: { b:7, h:12, img:'struisvogel_kijk' } };   // drie houdingen (v0.81)
const STRUIKEN = { rond: { b:6, h:5, img:'struik1' }, bloei: { b:7, h:4, img:'struik2' }, bloemen: { b:5, h:4, img:'struik3' } };
function spulMaat(o){   // breedte en hoogte in blokjes (een o is 6 blokjes hoog)
  if(STEVIG[o.soort]) return { b: STEVIG[o.soort].b, h: STEVIG[o.soort].h };
  switch(o.soort){
    case 'boom':     { const s = BOMEN[o.maat]; return s ? { b:s.b, h:s.h } : { b:20, h:24 }; }   // 4 keer zo hoog als een o
    case 'put':      return { b:9,  h:9 };
    case 'kist':     return { b:4,  h:3 };    // half zo hoog als een o: een opstapje
    case 'hond':     return { b:5,  h:5 };
    case 'cactus':   return { b:9,  h:9 };
    case 'molen':    return { b:15, h:26 };   // decor: iets kleiner dan 'echt', zodat het verderop lijkt te staan
    case 'huis':     return { b:14, h:14 };
    case 'struik':   { const s = STRUIKEN[o.maat] || STRUIKEN.rond; return { b:s.b, h:s.h }; }
    case 'lantaarn': return { b:4,  h:13 };
    case 'bank':     return { b:8,  h:4 };
    case 'vogelverschrikker': return { b:9, h:12 };   // decor uit decor2.png (v0.74)
    case 'wegwijzer':  return { b:6, h:11 };
    case 'brievenbus': return { b:4, h:8 };
    case 'vogelhuisje': return { b:5, h:13 };
    case 'kruiwagen':  return { b:7, h:5 };
    case 'ufo':        return { b:14, h:10 };   // decor uit items.png (v0.81)
    case 'struisvogel': { const s = STRUISVOGELS[o.maat] || STRUISVOGELS.staan; return { b:s.b, h:s.h }; }
    case 'glijbaan':   return { b:16, h:13 };
    case 'molentje':   return { b:5,  h:8 };
    case 'banaan':     return { b:16, h:12 };   // een reuzenbanaan: even breed als de glijbaan
    case 'f1':         return { b:17, h:7 };    // decor uit items2.png (v0.99)
    case 'racefiets':  return { b:12, h:8 };
    case 'voetbal':    return { b:4,  h:4 };
    case 'tablet':     return { b:9,  h:12 };
    case 'stoommachine': return { b:14, h:13 };
    case 'ridder':     return { b:7,  h:11 };   // decor uit items3.png (v1.3)
    case 'vlag':       return { b:9,  h:13 };   // wapperende vlag (3 standen)
    case 'koe':        return { b:14, h:10 };
    case 'hart':       return { b:6,  h:5 };
    case 'betonmolen': return { b:11, h:11 };   // decor uit items4.png (v1.13)
    case 'bouwvakker': return { b:11, h:11 };
    case 'kraan':      return { b:30, h:32 };   // een echte bouwkraan: zo'n vijf o's hoog
    case 'hangmat':    return { b:16, h:10 };
    case 'ruimtemannetje': return { b:7, h:12 };
    case 'planeetplant': return { b:9, h:13 };   // (v1.56) decor voor de vreemde planeet
    case 'raketje':    return { b:11, h:14 };
    case 'kristal':    return { b:8,  h:9 };
    case 'zweefmolen': return { b:24, h:26 };   // (v1.74) decor uit items6.png: de zweefmolen het grootst (zo hoog als de windmolen),
    case 'borstbeeld': return { b:12, h:17 };   // het borstbeeld daarna,
    case 'duiveltje':  return { b:10, h:10 };   // duiveltje en beestje even groot
    case 'beestje':    return { b:10, h:10 };
    case 'rook':       return { b: ({ klein:3, middel:5, groot:8 })[o.maat] || 5, h:2 };   // (v1.29) de bovenkant van een schoorsteen
  }
  return null;
}
// ---- hoe het decor eruitziet (deze getallen kun je bijstellen) ----
const DECOR_VAAG = 0.55;           // scherpte: plaatjespixels per spelpixel (lager = vager)
const DECOR_WAAS = 'rgb(172,198,224)', DECOR_WAAS_STERK = 0.42;   // lichter en blauwiger, zoals dingen in de verte
const DECOR_DEKKING = 0.85;        // een heel klein beetje doorzichtig
const DECOR_ZAK = 5;               // zoveel spelpixels zakt de voet achter de graslijn weg
const MOLEN_NAAF = [0.504, 0.244]; // waar het wiekenkruis vastzit (het rondje in het dak), als deel van de molen
const MOLEN_KRUIS = 176;           // doorsnede van het wiekenkruis in spelpixels
const MOLEN_DRAAI = 0.35;          // draaisnelheid van de wieken
const MOLENTJE_WIEL = 0.62;        // doorsnede van het kinderwindmolentje, als deel van zijn hoogte
const MOLENTJE_DRAAI = 2.4;        // draaisnelheid van het molentje (het waait soms wat harder, soms wat zachter)
const STOOM_NAAF = [0.683, 0.639];  // as van het vliegwiel op de stoommachine (deel van het plaatje)
const STOOM_WIEL = 0.56;            // doorsnede van het vliegwiel, als deel van de hoogte van de machine
const STOOM_DRAAI = 1.6;            // draaisnelheid van het vliegwiel
const STOOM_PIJP = [0.33, 0.02];    // bovenkant van de hoge schoorsteen: daar komen de stoomwolkjes uit
const VLAG_TEMPO = 5;              // zoveel standen per seconde wappert de vlag (de wind wisselt een beetje)
const SCHOORSTEEN = [0.75, 0.05];  // bovenkant van de schoorsteen, als deel van het huis
const SCHADUW_BREED = { boom:0.5, put:0.85, kist:1.0, hond:0.8, cactus:0.8, boeken:0.95, blokken:1.0, stronk:0.9, ton:0.85, cadeau:1.0, theepot:1.25 };
// de hond (8 beeldjes: 1-2 slapen, 3-4 wakker schrikken en opspringen, 5-8 blaffen)
const HOND_CEL = 110, HOND_CH = 130, HOND_ANKER_Y = 125.3, HOND_SCHAAL = 1/3, HOND_FPS = 8;
function hondBeeld(o, t){
  if(o.wakker == null) return Math.floor(t*1.4) % 2;           // slapen en rustig ademen
  const v = t - o.wakker;
  if(v < 0.32) return v < 0.14 ? 2 : 3;                         // schrikken en opspringen
  return 4 + Math.floor((v - 0.32)*HOND_FPS) % 4;               // blaffen
}
// een vervaagde, lichtere versie van een decorplaatje (één keer gemaakt, daarna bewaard)
const vaagCache = {};
function vaagPlaatje(naam, b, h){
  const img = objPlaatje(naam); if(!img) return null;
  const sleutel = naam + '|' + b + '|' + h;
  if(vaagCache[sleutel]) return vaagCache[sleutel];
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(b*DECOR_VAAG)); c.height = Math.max(2, Math.round(h*DECOR_VAAG));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = DECOR_WAAS_STERK;
  g.fillStyle = DECOR_WAAS; g.fillRect(0, 0, c.width, c.height);
  if(typeof opKaart === 'function') opKaart(c, bm => { vaagCache[sleutel] = bm; });   // alleen in het spel
  return (vaagCache[sleutel] = c);
}
// ---- (v1.56) beweging in het decor van de vreemde planeet (plekken als deel van het plaatje) ----
const PLANEET_DECOR = {
  planeetplant: { wieg: 0.03, gloed: [[0.77, 0.21, 0.19], [0.19, 0.39, 0.18], [0.73, 0.55, 0.17]], kleur: ['255,150,220', '210,255,120'] },
  raketje:      { lamp: [0.47, 0.035, 0.09], raam: [0.32, 0.45, 0.12] },
  kristal:      { gloed: [[0.48, 0.30, 0.16], [0.20, 0.42, 0.14], [0.75, 0.45, 0.14], [0.36, 0.60, 0.12], [0.56, 0.66, 0.11], [0.83, 0.64, 0.11]],
                  kleur: ['255,120,210', '200,255,90', '200,120,255', '255,120,210', '200,120,255', '200,255,90'] }
};
function gloeiPlek(c, x, y, r, kleur, a){
  if(a <= 0.01) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${kleur},${a})`); g.addColorStop(1, `rgba(${kleur},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
}
function tekenPlaneetDecor(c, o, t, naam, img, ix, iy, ib, ih){
  const d = PLANEET_DECOR[o.soort], fase = o.x*0.37 + o.y*0.11, vaag = vaagPlaatje(naam, ib, ih);
  c.save();
  if(d.wieg){   // de plant wiegt zacht heen en weer rond zijn voet
    const vx = ix + ib/2, vy = iy + ih;
    c.translate(vx, vy); c.rotate(Math.sin(t*0.9 + fase)*d.wieg + Math.sin(t*2.3 + fase)*d.wieg*0.3); c.translate(-vx, -vy);
  }
  c.drawImage(vaag || img, ix, iy, ib, ih);
  c.globalCompositeOperation = 'lighter';
  if(d.gloed) d.gloed.forEach(([px, py, pr], i) => {   // zacht opgloeien, elk in een eigen ritme
    const a = 0.16 + 0.16*Math.sin(t*(1.6 + i*0.3) + fase + i*2.1);
    gloeiPlek(c, ix + px*ib, iy + py*ih, pr*ib*1.4, d.kleur[i % d.kleur.length], a);
  });
  if(d.lamp){   // het lampje op de antenne knippert (en het raampje gloeit warm na)
    const aan = ((t + fase) % 1.4) < 0.7;
    if(aan){ gloeiPlek(c, ix + d.lamp[0]*ib, iy + d.lamp[1]*ih, d.lamp[2]*ib*2.2, '255,225,90', 0.7); gloeiPlek(c, ix + d.lamp[0]*ib, iy + d.lamp[1]*ih, d.lamp[2]*ib*0.8, '255,250,200', 0.6); }
    gloeiPlek(c, ix + d.raam[0]*ib, iy + d.raam[1]*ih, d.raam[2]*ib*1.5, '255,190,90', 0.12 + 0.05*Math.sin(t*7 + fase) + 0.04*Math.sin(t*13));
  }
  if(o.soort === 'kristal'){   // af en toe fonkelt er een sterretje op een van de kristallen
    const p = (t*0.8 + fase) % 1, i = Math.floor(t*0.8 + fase) % d.gloed.length, [px, py] = d.gloed[i];
    if(p < 0.35){
      const s = Math.sin(p/0.35*Math.PI), sx = ix + px*ib, sy = iy + (py - 0.08)*ih, r = ib*0.09*s;
      c.fillStyle = `rgba(255,255,255,${0.9*s})`; c.beginPath();
      for(let k = 0; k < 8; k++){ const h = k*Math.PI/4, rr = k % 2 ? r*0.22 : r; c.lineTo(sx + Math.cos(h)*rr, sy + Math.sin(h)*rr); }
      c.closePath(); c.fill();
    }
  }
  c.restore();
}
// ---- (v1.29) rookpluim: donkere roetrook uit een schoorsteen in de achtergrond ----
// Zelf onzichtbaar (in de editor zie je een stippelrondje). Elke pluim heeft een eigen tempo, zodat ze niet tegelijk puffen.
const ROOK_KLEUR = '38,38,42';       // donkergrijs, bijna zwart
const ROOK_LEVEN = 5;                // zo lang (seconden) doet een wolkje erover om op te stijgen en te vervagen
const ROOK_WOLKJES = 9;              // zoveel wolkjes tegelijk
const ROOK_WIND = 0.35;              // de rook waait een beetje opzij (plus = naar rechts, zoals de geschilderde rook; v1.30)
const ROOK_MARKER = !!window.OELIE_EDITOR;   // in de editor een stippellijntje bij de rookpluim (hij heeft geen plaatje)
function tekenRook(c, o, t){
  const m = objectMaat(o), k = m.b/5, sx = (o.x + m.b/2)*BLOK, sy = (o.y + m.h/2)*BLOK;
  const eigen = ((o.x*0.618 + o.y*0.382) % 1 + 1) % 1;          // per pluim een ander ritme
  const leven = ROOK_LEVEN*(0.85 + 0.3*eigen), hoog = 110*k;
  c.save();
  for(let i = 0; i < ROOK_WOLKJES; i++){
    const v = ((t/leven + i/ROOK_WOLKJES + eigen) % 1), r = (3.5 + v*20)*k;
    const a = 0.62*(1 - v)*Math.min(1, v*5);
    c.fillStyle = `rgba(${ROOK_KLEUR},${a})`;
    c.beginPath();
    c.arc(sx + ROOK_WIND*v*hoog + Math.sin(t*0.9 + i*2.3 + eigen*6)*3*k*v, sy - v*hoog, r, 0, Math.PI*2);
    c.fill();
  }
  if(ROOK_MARKER){
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.setLineDash([2, 2]);
    c.beginPath(); c.arc(sx, sy, Math.max(4, m.b*BLOK/2), 0, Math.PI*2); c.stroke();
  }
  c.restore();
}
function tekenDecor(c, o, t){
  if(o.soort === 'rook'){ tekenRook(c, o, t); return; }
  const m = objectMaat(o), x = o.x*BLOK, y = o.y*BLOK, b = m.b*BLOK, h = m.h*BLOK, onder = y + h + DECOR_ZAK;
  const naam = o.soort === 'molen' ? 'molenkern' : o.soort === 'struik' ? (STRUIKEN[o.maat] || STRUIKEN.rond).img :
               o.soort === 'struisvogel' ? (STRUISVOGELS[o.maat] || STRUISVOGELS.staan).img : o.soort === 'molentje' ? 'molentje_stok' : o.soort === 'vlag' ? 'vlag1' : o.soort;
  const img = objPlaatje(naam);
  c.save(); c.globalAlpha *= DECOR_DEKKING; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if(!img){ c.fillStyle = 'rgba(172,198,224,.35)'; c.fillRect(x, y + DECOR_ZAK, b, h); c.restore(); return; }
  if(o.soort === 'molentje'){   // kinderwindmolentje: stokje staat stil, het molentje draait (v0.81)
    const d = Math.min(b, h*MOLENTJE_WIEL), sh = h - d/2 + 2, mx = x + b/2;
    const sb = sh*img.naturalWidth/img.naturalHeight;
    c.drawImage(vaagPlaatje('molentje_stok', sb, sh) || img, mx - sb/2, onder - sh, sb, sh);
    const wiel = objPlaatje('molentje_wiel');
    if(wiel){
      c.save(); c.translate(mx, onder - sh + 2); c.rotate(t*MOLENTJE_DRAAI + Math.sin(t*0.6)*1.2);
      c.drawImage(vaagPlaatje('molentje_wiel', d, d) || wiel, -d/2, -d/2, d, d);
      c.restore();
    }
    c.restore(); return;
  }
  const ih = h, ib = ih*img.naturalWidth/img.naturalHeight, ix = x + (b - ib)/2, iy = onder - ih;
  // rook uit de schoorsteen: zachte wolkjes die opstijgen en vervagen (achter het huis langs)
  if(o.soort === 'huis'){
    const sx = ix + SCHOORSTEEN[0]*ib, sy = iy + SCHOORSTEEN[1]*ih, N = 6, LEVEN = 4;
    for(let i=0;i<N;i++){
      const v = ((t/LEVEN + i/N) % 1), r = 2.5 + v*7;
      c.fillStyle = `rgba(226,233,241,${0.42*(1 - v)*Math.min(1, v*6)})`;
      c.beginPath(); c.arc(sx + v*14 + Math.sin(t*1.3 + i*2.1)*2*v, sy - 2 - v*42, r, 0, Math.PI*2); c.fill();
    }
  }
  // stoom uit de stoommachine: wittere, snellere wolkjes dan de rook van het huisje (v0.99)
  if(o.soort === 'stoommachine'){
    const sx = ix + STOOM_PIJP[0]*ib, sy = iy + STOOM_PIJP[1]*ih, N = 7, LEVEN = 2.2;
    for(let i=0;i<N;i++){
      const v = ((t/LEVEN + i/N) % 1), r = 2 + v*8;
      c.fillStyle = `rgba(244,247,251,${0.55*(1 - v)*Math.min(1, v*8)})`;
      c.beginPath(); c.arc(sx + v*10 + Math.sin(t*2.1 + i*1.7)*2.5*v, sy - 2 - v*38, r, 0, Math.PI*2); c.fill();
    }
  }
  if(o.soort === 'vlag'){   // wapperende vlag (v1.3): standen 1-2-3-2-1..., zacht in elkaar overvloeiend
    const REEKS = [1, 2, 3, 2], f = t*VLAG_TEMPO + Math.sin(t*0.7 + o.x*0.37)*0.9 + o.x*0.13;
    const i = Math.floor(f), d = f - i, a = 'vlag' + REEKS[((i % 4) + 4) % 4], z = 'vlag' + REEKS[(((i + 1) % 4) + 4) % 4];
    c.drawImage(vaagPlaatje(a, ib, ih) || img, ix, iy, ib, ih);
    c.globalAlpha *= d; c.drawImage(vaagPlaatje(z, ib, ih) || img, ix, iy, ib, ih);
    c.restore(); return;
  }
  // (v1.56) decor voor de vreemde planeet: de plant wiegt en zijn knoppen gloeien, het lampje van het raketje knippert,
  // de kristallen gloeien om de beurt op en er fonkelt af en toe een sterretje
  if(PLANEET_DECOR[o.soort]){ tekenPlaneetDecor(c, o, t, naam, img, ix, iy, ib, ih); c.restore(); return; }
  const vaag = vaagPlaatje(naam, ib, ih);
  c.drawImage(vaag || img, ix, iy, ib, ih);
  if(o.soort === 'stoommachine'){
    const wiel = objPlaatje('vliegwiel');
    if(wiel){
      const d = STOOM_WIEL*ih, wv = vaagPlaatje('vliegwiel', d, d);
      c.save(); c.translate(ix + STOOM_NAAF[0]*ib, iy + STOOM_NAAF[1]*ih); c.rotate(t*STOOM_DRAAI);
      c.drawImage(wv || wiel, -d/2, -d/2, d, d);
      c.restore();
    }
  }
  if(o.soort === 'molen'){
    const kruis = objPlaatje('molenkruis');
    if(kruis){
      const d = MOLEN_KRUIS, kv = vaagPlaatje('molenkruis', d, d);
      c.save(); c.translate(ix + MOLEN_NAAF[0]*ib, iy + MOLEN_NAAF[1]*ih); c.rotate(t*MOLEN_DRAAI);
      c.drawImage(kv || kruis, -d/2, -d/2, d, d);
      c.restore();
    }
  }
  c.restore();
}
function tekenDing(c, o, t){
  if(o.schuif){ c.save(); c.translate(o.schuif, 0); const s = o.schuif; o.schuif = 0; tekenDing(c, o, t); o.schuif = s; c.restore(); return; }   // (v1.32) wordt door Hooky getrokken
  const m = objectMaat(o), x = o.x*BLOK, y = o.y*BLOK, b = m.b*BLOK, h = m.h*BLOK, onder = y + h, mx = x + b/2;
  c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  // schaduwplekje op de grond: alleen wat echt op het speelveld staat, heeft een schaduw
  const sb = b*(SCHADUW_BREED[o.soort] || 0.8)/2, sh = 3.2;
  const sg = c.createRadialGradient(mx, onder - 0.5, 0, mx, onder - 0.5, sb);
  sg.addColorStop(0, 'rgba(10,15,25,.42)'); sg.addColorStop(0.7, 'rgba(10,15,25,.2)'); sg.addColorStop(1, 'rgba(10,15,25,0)');
  c.save(); c.translate(mx, onder - 0.5); c.scale(1, sh/sb); c.translate(-mx, -(onder - 0.5));
  c.fillStyle = sg; c.beginPath(); c.arc(mx, onder - 0.5, sb, 0, Math.PI*2); c.fill(); c.restore();
  if(o.soort === 'hond'){
    const img = objPlaatje('hond');
    if(img){
      const beeld = hondBeeld(o, t), k = o.kijk || 1;
      c.translate(mx, onder + 1); c.scale(k*HOND_SCHAAL, HOND_SCHAAL);
      c.drawImage(img, beeld*HOND_CEL, 0, HOND_CEL, HOND_CH, -HOND_CEL/2, -HOND_ANKER_Y, HOND_CEL, HOND_CH);
    }
    c.restore(); return;
  }
  const img = objPlaatje(o.soort === 'boom' && BOMEN[o.maat] ? BOMEN[o.maat].img : o.soort);
  if(!img){ c.fillStyle = '#8a929c'; c.fillRect(x, y, b, h); c.restore(); return; }
  let ib, ih;
  if(o.soort === 'kist'){ ib = b; ih = ib*img.naturalHeight/img.naturalWidth; }   // de bovenkant steekt een stukje uit: daar staan ze op
  else { ih = h/(1 - (STEVIG[o.soort] ? STEVIG[o.soort].boven : 0)); ib = ih*img.naturalWidth/img.naturalHeight; }   // bij stevige spullen steekt het 'boven'-deel uit
  const mid = (STEVIG[o.soort] && STEVIG[o.soort].midden) || 0.5;   // (v1.12) plaatje kan opzij uitsteken (theepot)
  c.drawImage(img, mx - ib*mid, onder - ih + 1, ib, ih);
  c.restore();
}
const OBJ_IMG = {};
for(const [k, bron] of Object.entries(OBJ_BRON)){ const i = new Image(); i.src = bron; OBJ_IMG[k] = i; }
const objPlaatje = k => (OBJ_IMG[k] && OBJ_IMG[k].complete && OBJ_IMG[k].naturalWidth) ? OBJ_IMG[k] : null;
function naObjectPlaatjes(fn){ for(const i of [...Object.values(OBJ_IMG), grondImg]) if(!i.complete) i.addEventListener('load', fn); }
// een balk of plank van elke lengte: de uiteinden blijven heel, van het middenstuk gebruiken we zoveel als nodig is
function tekenLat(c, img, x, y, lengte, dik){
  const W = img.naturalWidth, H = img.naturalHeight, sx = (OBJ_LENGTES.lang*BLOK)/W;
  const e = Math.min(W*0.08, H*1.2), ed = e*sx, mid = Math.max(0, lengte - 2*ed);
  c.drawImage(img, 0, 0, e, H, x, y, ed, dik);
  c.drawImage(img, e, 0, Math.min(W - 2*e, mid/sx), H, x + ed, y, mid, dik);
  c.drawImage(img, W - e, 0, e, H, x + ed + mid, y, ed, dik);
}
// Ligt dit blokje binnen het vak van een helling? Dan groeit op de grond eronder geen gras
// (de helling heeft zijn eigen graslijn, die bij de punt naadloos aansluit op het gras ernaast).
function inHellingVak(objecten, bx, by){
  for(const o of objecten || []){
    if(o.soort !== 'helling') continue;
    const m = objectMaat(o);
    if(bx >= o.x && bx < o.x + m.b && by >= o.y && by < o.y + m.h) return true;
  }
  return false;
}
// De helling is een stukje landschap: dezelfde zachte-grondtextuur als de blokjes (grond.png), op dezelfde
// plek in het patroon, zodat hij naadloos aansluit. Langs de schuine kant een graslijn zoals op de gewone grond.
let hellingVulling = null;
function tekenHelling(c, o){
  const m = objectMaat(o), x = o.x*BLOK, y = o.y*BLOK, b = m.b*BLOK, h = m.h*BLOK, p = objectPad(o);
  if(!hellingVulling && grondImg.complete && grondImg.naturalWidth){
    hellingVulling = c.createPattern(grondImg, 'repeat'); hellingVulling.setTransform(new DOMMatrix().scale(0.5));
  }
  c.save();
  c.fillStyle = hellingVulling || '#8a5a34'; c.fill(p);
  // de schuine kant: van de punt onderaan naar de top
  const x0 = o.richting === -1 ? x + b : x, x1 = o.richting === -1 ? x : x + b, y0 = y + h, y1 = y;
  const lijn = () => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); };
  // het gras mag bij de punt 3 pixels de grond in lopen: daar sluit het aan op het gras van de grond ernaast
  const grasVak = new Path2D(p); grasVak.rect(x, y + h, b, 3);
  c.save(); c.clip(grasVak);
  lijn(); c.lineWidth = 6; c.strokeStyle = '#5f9e43'; c.stroke();   // 3 pixels gras (binnen de vorm)
  lijn(); c.lineWidth = 2; c.strokeStyle = '#7dbb55'; c.stroke();   // lichte bovenrand
  c.restore();
  // sprietjes, zoals op de gewone grond
  const lengte = Math.hypot(b, h), n = Math.floor(lengte/BLOK);
  c.fillStyle = '#5f9e43';
  for(let i=1;i<n;i++){
    const r = ruis(o.x*7 + i, o.y*3 + i*11); if(r <= 0.5) continue;
    const f = (i + r - 0.5)/n, px = x0 + (x1 - x0)*f, py = y0 + (y1 - y0)*f;
    c.fillRect(px - 0.5, py - 2, 1, 2);
  }
  c.restore();
}
function tekenObject(c, o, t){
  const m = objectMaat(o), x = o.x*BLOK, y = o.y*BLOK, b = m.b*BLOK, h = m.h*BLOK;
  if(o.soort === 'parachute'){ tekenParachutePakket(c, x + b/2, y, b, h, t || 0); return; }
  if(o.soort === 'drukplaat'){ tekenDrukplaat(c, x, y, b, h, t || 0, o.v); return; }   // (v1.71)
  if(o.soort === 'helling'){ tekenHelling(c, o); return; }
  if(o.soort === 'schuin'){
    const lat = objPlaatje(o.lat);
    c.save(); c.translate(o.midden[0], o.midden[1]); c.rotate(o.hoek);
    if(lat) tekenLat(c, lat, -o.lengte/2, -o.dik/2, o.lengte, o.dik); else { c.fillStyle = '#9aa3ad'; c.fillRect(-o.lengte/2, -o.dik/2, o.lengte, o.dik); }
    c.restore(); return;
  }
  if(isDecor(o)){ tekenDecor(c, o, t || 0); return; }
  if(isDing(o)){ tekenDing(c, o, t || 0); return; }
  const img = objPlaatje(o.soort);
  if(img){
    c.save();
    if(o.soort === 'boog') c.drawImage(img, x, y, b, h);
    else if(o.stand === 'verticaal'){ c.translate(x + b/2, y + h/2); c.rotate(Math.PI/2); tekenLat(c, img, -h/2, -b/2, h, b); }
    else tekenLat(c, img, x, y, b, h);
    c.restore(); return;
  }
  const p = objectPad(o);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#bcc4cd'); g.addColorStop(1, '#8a929c');
  c.save();
  c.fillStyle = g; c.fill(p);
  c.clip(p);   // een lichte rand aan de bovenkant, zodat het een beetje diepte krijgt
  c.translate(0, 1.4); c.lineWidth = 2.6; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(p);
  c.restore();
  c.save(); c.lineWidth = 1; c.lineJoin = 'round'; c.strokeStyle = '#4c5561'; c.stroke(p); c.restore();
}
// een parachute (koepel met touwtjes); x = midden, yTop = bovenkant van de koepel
function tekenParachuteKoepel(c, x, yTop, breed, hoog, touw, tot){
  const n = 4, links = x - breed/2, onder = yTop + hoog;
  c.save();
  c.strokeStyle = '#5a636e'; c.lineWidth = 0.8;
  for(let i=0;i<=n;i++){ c.beginPath(); c.moveTo(links + breed*i/n, onder - 0.5); c.lineTo(tot ? tot.x : x, tot ? tot.y : onder + touw); c.stroke(); }
  c.beginPath(); c.moveTo(links, onder);
  c.bezierCurveTo(links, yTop - hoog*0.35, links + breed, yTop - hoog*0.35, links + breed, onder);
  for(let i=n;i>0;i--){ const xa = links + breed*i/n, xb = links + breed*(i-1)/n; c.quadraticCurveTo((xa + xb)/2, onder - hoog*0.28, xb, onder); }
  c.closePath();
  const g = c.createLinearGradient(0, yTop, 0, onder);
  g.addColorStop(0, '#d2d8df'); g.addColorStop(1, '#98a0aa');
  c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = '#4c5561'; c.stroke();
  c.strokeStyle = 'rgba(76,85,97,.5)'; c.lineWidth = 0.7;   // naden in de koepel
  for(let i=1;i<n;i++){ c.beginPath(); c.moveTo(x, yTop - hoog*0.08); c.quadraticCurveTo(links + breed*i/n, yTop + hoog*0.2, links + breed*i/n, onder - hoog*0.2); c.stroke(); }
  c.restore();
}
// de parachute zoals hij in het level hangt en wacht op een o (zweeft zachtjes op en neer)
function tekenParachutePakket(c, x, y, b, h, t){
  const dein = Math.sin(t*2.2)*1.5, img = objPlaatje('parachute_pakket');
  if(img){ const ph = h - 2, pb = ph*img.naturalWidth/img.naturalHeight; c.drawImage(img, x - pb/2, y + 1 + dein, pb, ph); return; }
  tekenParachuteKoepel(c, x, y + 4 + dein, 28, 12, 15);
  c.save(); c.fillStyle = '#8a929c'; c.strokeStyle = '#4c5561'; c.lineWidth = 1;
  c.beginPath(); c.roundRect ? c.roundRect(x - 5, y + 30 + dein, 10, 8, 2) : c.rect(x - 5, y + 30 + dein, 10, 8); c.fill(); c.stroke();
  c.restore();
}

// ---- (v1.71) De drukplaat (ontstekingsmechanisme) ----
// Een platte metalen plaat met klinknagels, half in de grond, met een lontje aan de rechterkant.
// v = hoe ver het lontje is opgebrand (undefined = nog niet aangezet, 0..1 = brandt).
// x, y = linkerbovenhoek van het vak (4 x 1 blokjes); de onderkant van het vak is de grond.
function tekenDrukplaat(c, x, y, b, h, t, v){
  const aan = typeof v === 'number', in_ = aan ? 1.6 : 0;   // aangezet: de plaat is ingedrukt
  const top = y + h - 5 + in_, onder = y + h + 1.5;
  c.save();
  // het lontje: een krulletje van de rechterrand omhoog, korter naarmate het opbrandt
  const L = aan ? Math.max(0, 1 - v) : 1;
  const p0 = [x + b - 3, top + 1.5], p1 = [x + b + 5, top - 1], p2 = [x + b + 1, top - 8], p3 = [x + b + 6, top - 11];
  const punt = k => { const u = 1 - k; return [u*u*u*p0[0] + 3*u*u*k*p1[0] + 3*u*k*k*p2[0] + k*k*k*p3[0], u*u*u*p0[1] + 3*u*u*k*p1[1] + 3*u*k*k*p2[1] + k*k*k*p3[1]]; };
  if(L > 0.02){
    c.beginPath(); c.moveTo(p0[0], p0[1]);
    for(let i = 1; i <= 16; i++){ const q = punt(L*i/16); c.lineTo(q[0], q[1]); }
    c.lineCap = 'round'; c.strokeStyle = '#3b2a1a'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(214,180,120,.55)'; c.lineWidth = 0.6; c.stroke();
  }
  // de plaat
  const r = 1.8;
  c.beginPath();
  if(c.roundRect) c.roundRect(x + 0.5, top, b - 1, onder - top, r); else c.rect(x + 0.5, top, b - 1, onder - top);
  const g = c.createLinearGradient(0, top, 0, onder);
  g.addColorStop(0, '#b9c1ca'); g.addColorStop(0.45, '#8c949e'); g.addColorStop(1, '#5c646e');
  c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = '#3c444e'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.7;   // glimlijntje bovenop
  c.beginPath(); c.moveTo(x + 2.5, top + 0.9); c.lineTo(x + b - 2.5, top + 0.9); c.stroke();
  // klinknagels
  for(const kx of [x + 3.2, x + b - 3.2, x + b*0.33, x + b*0.67]){
    c.beginPath(); c.arc(kx, top + 2.9, 0.95, 0, Math.PI*2);
    c.fillStyle = '#d7dde3'; c.fill(); c.lineWidth = 0.5; c.strokeStyle = '#4a525c'; c.stroke();
  }
  // het lampje in het midden: dof rood; aangezet knippert het, steeds sneller
  const lx = x + b/2, ly = top - 0.6;
  let licht = 0.25;
  if(aan){ const f = 2.5 + 14*v*v; licht = (Math.sin(t*f*Math.PI*2) > 0) ? 1 : 0.35; }
  if(licht > 0.5){
    const gl = c.createRadialGradient(lx, ly, 0, lx, ly, 7);
    gl.addColorStop(0, 'rgba(255,90,60,.7)'); gl.addColorStop(1, 'rgba(255,60,40,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(lx, ly, 7, 0, Math.PI*2); c.fill();
  }
  c.beginPath(); c.arc(lx, ly + 0.6, 2.1, Math.PI, 0); c.closePath();
  c.fillStyle = licht > 0.5 ? '#ff5a3c' : '#9a2f24'; c.fill(); c.lineWidth = 0.6; c.strokeStyle = '#4a1610'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(lx - 0.7, ly - 0.4, 0.55, 0, Math.PI*2); c.fill();
  // het vonkje aan het eind van het lontje
  if(aan && L > 0.02){
    const [sx, sy] = punt(L), rr = 2.2 + Math.sin(t*37)*0.5;
    const gs = c.createRadialGradient(sx, sy, 0, sx, sy, rr*1.9);
    gs.addColorStop(0, 'rgba(255,255,235,1)'); gs.addColorStop(0.35, 'rgba(255,215,90,.9)'); gs.addColorStop(1, 'rgba(255,120,30,0)');
    c.fillStyle = gs; c.beginPath(); c.arc(sx, sy, rr*1.9, 0, Math.PI*2); c.fill();
    c.fillStyle = 'rgba(255,245,200,.95)'; c.beginPath();
    for(let i = 0; i < 8; i++){ const hk = i*Math.PI/4 + t*6, q = i % 2 ? rr*0.35 : rr*1.2; c.lineTo(sx + Math.cos(hk)*q, sy + Math.sin(hk)*q); }
    c.closePath(); c.fill();
  }
  c.restore();
}
