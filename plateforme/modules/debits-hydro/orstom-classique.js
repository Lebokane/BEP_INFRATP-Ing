/* Numérisation v2 — source Rodier & Auvray (ORSTOM, 1965), figures 2 à 7.
   Interpolation log-linéaire sur S ∈ [2, 120] km². Aucun lissage polynomial. */
(function(root){'use strict';

const SGRID=[2,3,5,7,10,15,20,30,50,70,100,120];

function interp(vals){
  return function(S){
    if(S<=SGRID[0])return vals[0];
    if(S>=SGRID[SGRID.length-1])return vals[vals.length-1];
    const lS=Math.log10(S);
    for(let i=0;i<SGRID.length-1;i++){
      if(S<=SGRID[i+1]){
        const l0=Math.log10(SGRID[i]),l1=Math.log10(SGRID[i+1]);
        const t=(lS-l0)/(l1-l0);
        return vals[i]+t*(vals[i+1]-vals[i]);
      }
    }
    return vals[vals.length-1];
  };
}
function curve(vals){
  return [{lo:2,hi:120,
    expression:"log-lin S=[2,3,5,7,10,15,20,30,50,70,100,120] km² → ["+vals.join(', ')+"]",
    fn:interp(vals)}];
}

const curves={
  sahel:{
    R4P1: curve([95,93,90,87,84,80,76,70,62,56,50,46]),
    R4P2: curve([82,81,80,79,78,75,72,68,62,57,52,48]),
    R3P2: curve([73,72,70,69,68,66,65,63,58,54,50,47]),
    R2P2: curve([60,59,58,57,56,54,53,51,48,45,42,40]),
    R5P3: curve([55,54,52,51,49,47,45,42,38,34,30,28]),
    R4P3: curve([45,44,43,42,41,39,38,35,30,26,22,20]),
    R3P3: curve([35,34,33,32,31,30,28,26,23,20,17,15]),
    R2P3: curve([25,24,23,22,21,20,19,17,14,12,10,9]),
    R4P4: curve([24,23.5,23,22.5,22,20.5,19.5,17,13,10,7,5.5]),
    R3P4: curve([12,11.8,11.5,11,10.5,9.5,8.5,7,4.5,2.5,0.5,0])
  },
  tropical:{
    R4P2: curve([67.5,67.5,66.5,65,63,61,59.5,56,52,50,48.5,48]),
    R3P2: curve([54,53.5,52,51,50,48.5,47,45,42,39,36,34]),
    R2P2: curve([42,41.5,41,40.5,40,39,38,37,35,33,31,30]),
    R5P3: curve([52,51.5,51,50.5,50,49,48,46,43,41,38,37]),
    R4P3: curve([45,44.5,44,43,42,41,40,38,35,33,31,30]),
    R3P3: curve([37,36.5,36,35.5,35,34,33,32,30,28,26,25]),
    R2P3: curve([30,29.5,29,28.5,28,27,26,25,23,22,20,19]),
    R5P4: curve([38,37.5,37,36.5,36,35,34,32,29,26,24,22]),
    R4P4: curve([33,32.5,32,31.5,31,30,29,27,24,21,19,17]),
    R3P4: curve([23,22.7,22.3,22,21.5,21,20.3,19,17,15.5,14,13]),
    R4P5: curve([23,22.7,22.3,22,21.5,21,20.3,19,17,15.5,14,13]),
    R2P4: curve([15,14.5,14,13.5,13,12,11,9.5,7,5,3.5,2.5]),
    R3P5: curve([15,14.5,14,13.5,13,12,11,9.5,7,5,3.5,2.5]),
    R2P5: curve([8,6.5,5,4,3,2,1,0.5,0,0,0,0]),
    R2P6: curve([2,1.5,1,0.5,0,0,0,0,0,0,0,0])
  }
};

// ── Extension 120-200 km² (Rodier & Auvray 1965, p. 27-28) ──
const QSPEC_200_SAHEL = {
  R4P1:3000, R5P2:3000,   // plafond pratique p. 27
  R4P2:2000, R4P3:1100,
  R3P2:700,  R3P3:325,
  R2P2:400,  R2P3:110,
  R4P4:225,  R3P4:0
};

const KR_CONST_TROP_120_200 = {
  R4P2:48, R5P3:46, R3P2:40, R2P2:36, R4P3:38, R3P3:34, R5P4:36, R4P4:28, R3P4:18, R2P4:9,
  R2P3:29, R5P5:26, R4P5:18, R3P5:9, R2P5:5, R2P6:2
};

function krExtended(r, key, S){
  if(S <= 120) return kr(r, key, S);
  if(S > 200)  throw Error('Hors domaine ORSTOM étendu : S > 200 km².');
  if(r === 'tropical'){
    if(!(key in KR_CONST_TROP_120_200))
      throw Error('Classe '+key+' non tabulée en tropical étendu (120 < S ≤ 200).');
    return {
      value: KR_CONST_TROP_120_200[key],
      branch: 0,
      expression: 'Kr constant tropical (Rodier & Auvray 1965, p. 28) = '+KR_CONST_TROP_120_200[key]+' %',
      lo: 120, hi: 200
    };
  }
  throw Error('Extension sahélienne : utiliser specificDischargeSahel().');
}

function peakExtended(r, key, S){
  if(r === 'tropical' && S > 120){
    return key === 'R4P2' ? 3.5 : 3.2;   // p. 29
  }
  return peak(r, S);
}

function specificDischargeSahel(p, S, P10, A){
  const key = (p.oldRelief||'') + (p.oldPerm||'');
  if(S <= 120) throw Error('Débit spécifique sahélien : S > 120 km² requis.');
  if(S > 200)  throw Error('Débit spécifique sahélien : S ≤ 200 km² requis.');
  if(!(key in QSPEC_200_SAHEL))
    throw Error('Classe '+key+' non tabulée en débit spécifique sahélien (p. 27).');

  // Ancre à 120 km² : formule standard ORSTOM
  const krRes   = kr('sahel', key, 120);
  const Kr120   = krRes.value / 100;
  const Tb120min = tb('sahel', p.oldRelief, 120) * 60;
  const K120    = peak('sahel', 120);
  const Q10_120 = K120 * A * P10 * Kr120 * 120 * 1000 / (60 * Tb120min);
  const Qspec_120 = Q10_120 * 1000 / 120;   // l/s/km²

  // Ancre à 200 km² : table source p. 27
  const Qspec_200 = QSPEC_200_SAHEL[key];

  // Interpolation linéaire en S (formule source p. 28)
  const Qspec_S = Qspec_200 + (Qspec_120 - Qspec_200) * (200 - S) / (200 - 120);
  const Q10_S   = Qspec_S * S / 1000;   // m³/s

  return {
    Q10: Q10_S,
    key,
    details: {
      'Kr10 à 120 km² (%)':              krRes.value,
      'Tb à 120 km² (min)':              Tb120min,
      'Coefficient de pointe à 120 km²': K120,
      'Q10 à 120 km² (m³/s)':            Q10_120,
      'Qspec à 120 km² (l/s/km²)':       Qspec_120,
      'Qspec à 200 km² (table p. 27)':   Qspec_200,
      'Qspec interpolé (l/s/km²)':       Qspec_S
    }
  };
}


const R4_TB11_H=[3.75,4,4.75,5.75,7.25,8.75,10,12,14.5,16.5,18.5,19.5];
const R4_TB13_H=[[120,21],[150,23],[200,25.5]];
function tbR4Verified(S){
 if(!Number.isFinite(S)||S<2||S>200)throw Error('Tb R4 tropical : 2 ≤ S ≤ 200 km².');
 if(S<=120)return interp(R4_TB11_H)(S);
 for(let j=1;j<R4_TB13_H.length;j++){
  const [s0,t0]=R4_TB13_H[j-1],[s1,t1]=R4_TB13_H[j];
  if(S<=s1)return t0+(t1-t0)*(S-s0)/(s1-s0);
 }
}
const correctionEvidence={revision:'ORSTOM-R4-2026-09-12',source:'https://fr.slideshare.net/slideshow/rodier-auvray/57423574',krFigure:5,tbFigures:[11,13],status:'Lectures graphiques arrondies ; interpolation log-linéaire en S pour les graphiques 5 et 11, linéaire pour le graphique 13. Pas de calibration hydrologique.',krR4P2:[67.5,67.5,66.5,65,63,61,59.5,56,52,50,48.5,48],tbR4Figure11:R4_TB11_H,tbR4Figure13:R4_TB13_H};

const audit=[];

function regime(p){if(p.oldRegime==='auto'){let pan=Number(String(p.pan).replace(',','.'));if(!Number.isFinite(pan)||pan<=0)throw Error('Pan requis pour choisir le régime classique.');return pan<800?'sahel':'tropical';}if(['sahel','tropical'].includes(p.oldRegime))return p.oldRegime;throw Error('Sélectionner le régime des abaques classiques.');}
function issues(r,key){return audit.filter(a=>a.regime===r&&a.key===key);}
function blocked(r,key,j){return issues(r,key).some(a=>a.branch===j||a.jumpPct>20&&a.branches.includes(j));}
function kr(r,key,S){let b=curves[r]?.[key],j=b?.findIndex(v=>S>=v.lo&&S<=v.hi);if(!b||j<0)throw Error('Abaque Kr non disponible pour '+r+' / '+key+' à S = '+S+' km². Saisir Kr vérifié.');if(blocked(r,key,j))throw Error('Branche Kr suspendue : saisir Kr vérifié sur l’abaque original.');let v=b[j].fn(S);if(!(v>=0&&v<=100))throw Error('Kr numérisé non physique : saisir une valeur vérifiée.');return {value:v,branch:j,expression:b[j].expression,lo:b[j].lo,hi:b[j].hi};}
function tb(r,R,S){if(r==='tropical'&&R==='R4')return tbR4Verified(S);if(!['R2','R3','R4','R5'].includes(R))throw Error('Tb : relief '+R+' non couvert ; saisir le temps de base.');if(r==='sahel')return {R2:()=>6.040*S**.417,R3:()=>2.748*S**.489,R4:()=>1.746*S**.408,R5:()=>S<=10?.548*Math.exp(.161*S):1.193*S**.361}[R]();return {R2:()=>S<=10?8.804*Math.exp(.088*S):7.487*S**.448,R3:()=>3.998*S**.467,R4:()=>S<=10?2.86*Math.exp(.099*S):2.816*S**.426,R5:()=>S<=10?.653*S**.820:1.944*S**.326}[R]();}
function peak(r,S){return r==='tropical'?2.5:S<=25?2.6:S<=50?.02*S+2:S<=100?.002*S+2.9:3.1;}

function parameters(p,S,H){let modes=['oldKrMode','oldTbMode','oldKMode'].map(k=>p[k]||'manual');if(modes.some(m=>!['manual','auto'].includes(m)))throw Error('Mode ORSTOM classique non reconnu.');let auto=modes.includes('auto'),r=auto?regime(p):'saisi',key=(p.oldRelief||'')+(p.oldPerm||''),warnings=[],values={};
 if(auto){
  if(S<2||S>200)throw Error('Abaques classiques automatiques : 2 ≤ S ≤ 200 km² (extension 120-200 via débit spécifique sahélien ou Kr constant tropical). Au-delà, fournir des paramètres justifiés.');
let pan=H.pos(p.pan,'Pan');if(pan<150||pan>1600||p.coastal)throw Error('Climat hors domaine classique automatique : Pan 150–1600 mm et bassin non littoral requis.');warnings.push(r==='tropical'&&key==='R4P2'?'Kr R4P2 : graphique 5 relu sur la source ; lectures arrondies au demi-point, interpolation log-linéaire en S.':'Kr : numérisation antérieure ; fidélité à la courbe originale non vérifiée par le contrôle R4P2.');if((r==='sahel'&&pan>=800)||(r==='tropical'&&pan<800))warnings.push('Régime classique imposé différent du seuil de 800 mm/an : justifier le contexte.');if(!String(p.oldRef||'').trim())warnings.push('Justification des classes classiques R et P non renseignée.');values['Régime classique']=r;values['Classe classique']=key;if(S>120&&r==='sahel'){if(modes.some(m=>m!=='auto'))throw Error('Extension sahélienne : choisir les trois paramètres classiques automatiques pour Qspec, ou les trois paramètres saisis pour un bilan justifié.');return {specific:true,regime:'sahel',key,warnings,values};}}
 if(modes.includes('manual')&&!String(p.oldRef||'').trim())throw Error('Indiquer la référence des abaques et la justification des paramètres classiques saisis.');
 let kresult=modes[0]==='auto'?krExtended(r,key,S):null;
 let Kr=kresult?kresult.value:H.range(p.oldKr,'Kr10 classique (%)',.001,100),Tb=modes[1]==='auto'?tb(r,p.oldRelief,S):H.pos(p.oldTb,'Tb classique (h)'),K=modes[2]==='auto'?peakExtended(r,key,S):H.pos(p.oldAlpha,'Coefficient de pointe classique');
 if(kresult){values['Branche Kr (km²)']=kresult.lo+' à '+kresult.hi;values['Expression Kr (%)']=kresult.expression;}
 if(modes[1]==='auto')warnings.push(r==='tropical'&&p.oldRelief==='R4'?'Tb R4 tropical : lectures graphiques arrondies ; graphique 11 jusqu’à 120 km², graphique 13 au-delà. Les deux graphiques ne se raccordent pas exactement.':'Tb : ajustement antérieur non vérifié par le contrôle R4 tropical.');
 if(modes[2]==='auto'&&r==='sahel')warnings.push('Coefficient de pointe : raccord à 25 km² discontinu (2,6 puis environ 2,5), conservé du code fourni.');
 if(r==='tropical'){
 warnings.push('Deux conventions ORSTOM : K = 2,5 jusqu’à 120 km² (p. 23) ; K = 3,2, ou 3,5 pour R4P2, au-delà (p. 29). La rupture de calcul à 120 km² est conservée et ne représente pas une discontinuité physique du bassin.');
 if(S>120&&key==='R4P2')warnings.push('Kr étendu R4P2 = 48 % : galerie forestière insignifiante, condition source p. 28 à vérifier.');
 values['Référence du contrôle classique']='Rodier & Auvray 1965, graphiques 5, 11, 13 et p. 23, 28–29 ; '+correctionEvidence.source;
 values['Version du contrôle classique']=correctionEvidence.revision;
 values['Convention de calcul classique']=S<=120?'Abaques classiques ≤ 120 km²':'Extension publiée > 120 km² ; raccord discontinu';
 if(p.oldRelief==='R4'&&modes[1]==='auto')values['Référence Tb classique']=S<=120?'Graphique 11 ; lecture arrondie, interpolation log-linéaire':'Graphique 13 ; lecture arrondie, interpolation linéaire';
 if(S>120&&modes[2]==='auto'&&key!=='R4P2')warnings.push('Source p. 29 : règle générale K = 3,2 retenue ; l’exemple imprimé emploie 3,1. Cet écart documentaire est signalé, sans ajustement pour reproduire le résultat arrondi.');
 }
 values['Origine Kr10']=modes[0]==='auto'?'Abaque numérisé':'Saisie justifiée';values['Origine Tb']=modes[1]==='auto'?(r==='tropical'&&p.oldRelief==='R4'?'Lecture graphique contrôlée (arrondie)':'Ajustement numérisé'):'Saisie justifiée';values['Origine coefficient de pointe']=modes[2]==='auto'?(r==='tropical'?'Rodier & Auvray 1965, p. 23 et 29':'Relation du code fourni'):'Saisie justifiée';values['Tb classique (h)']=Tb;
 return {Kr:Kr/100,Tb:Tb*60,K,warnings,values};
}
root.Classic={correctionEvidence,curves,audit,regime,issues,blocked,kr,krExtended,tb,peak,peakExtended,parameters,specificDischargeSahel,QSPEC_200_SAHEL,KR_CONST_TROP_120_200};if(typeof module!=='undefined')module.exports=root.Classic;
})(typeof globalThis==='undefined'?window:globalThis);
