/* Hydrologie — unités internes explicites; calculs sans arrondis intermédiaires. */
(function(root){'use strict';
const POW=Math.pow;
const Classic=root.Classic||(typeof require!=='undefined'?require('./classic.js'):null);
const CLASSES={PI:'Particulièrement imperméable',I:'Imperméable · P2',RI:'Relativement imperméable · P3',P:'Perméable · P4',TP:'Très perméable',TI:'Imperméabilité totale · P1'};
function num(v,label){if(v===null||v===undefined||String(v).trim()==='')throw Error(label+' : donnée manquante.');let x=Number(String(v).replace(',','.'));if(!Number.isFinite(x))throw Error(label+' : valeur non numérique.');return x;}
function range(v,label,lo,hi=Infinity){let x=num(v,label);if(x<lo||x>hi)throw Error(label+' : valeur attendue entre '+lo+' et '+(hi===Infinity?'une borne positive finie':hi)+'.');return x;}
function pos(v,label){let x=num(v,label);if(x<=0)throw Error(label+' doit être strictement positif.');return x;}
function lerp(x,x0,x1,y0,y1){return x0===x1?y0:y0+(y1-y0)*(x-x0)/(x1-x0);}
function interpolate(x,table){let ks=Object.keys(table).map(Number).sort((a,b)=>a-b);if(x<ks[0]-1e-9||x>ks.at(-1)+1e-9)throw Error('Indice de pente hors des bornes disponibles : '+ks.join(', ')+' m/km. Saisir un paramètre issu d’une étude adaptée.');let exact=ks.find(k=>Math.abs(k-x)<1e-9);if(exact!==undefined)return table[exact];let hi=ks.find(k=>k>x),lo=ks[ks.indexOf(hi)-1];return lerp(x,lo,hi,table[lo],table[hi]);}
function area(p){let A=pos(p.area,'Superficie');return p.unit==='km2'?A*100:p.unit==='m2'?A/10000:A;}
function geometry(p){let A=area(p),L=pos(p.length,'Longueur hydraulique'),slope=pos(p.slope,'Pente moyenne (%)')/100;return {A,S:A/100,L,slope,M:L/(100*Math.sqrt(A))};}
function ig(p){if(p.igMode==='direct')return pos(p.ig,'Indice global de pente Ig');let S=area(p)/100,P=pos(p.perimeter,'Périmètre (km)'),D=pos(num(p.h5,'H5')-num(p.h95,'H95'),'Dénivelée H5 − H95');let K=.282*P/Math.sqrt(S);if(K<1.128)throw Error('Rectangle équivalent non défini pour ce périmètre : saisir Ig directement ou revoir le contour simplifié.');let L=Math.sqrt(S)*K/1.128*(1+Math.sqrt(1-POW(1.128/K,2)));return D/L;}
function climate(p,T){let c=p.rains.find(r=>Number(r.T)===Number(T));if(!c)throw Error('Aucune pluie renseignée pour T = '+T+' ans.');return c;}
function montana(p,T){let c=climate(p,T),a=pos(c.a,'Montana a ('+T+' ans)'),b=range(c.b,'Montana b',0.001,.999),tmin=pos(c.tmin,'Durée minimale Montana'),tmax=pos(c.tmax,'Durée maximale Montana');if(tmax<=tmin)throw Error('La durée maximale doit dépasser la durée minimale.');return {a:p.rainUnit==='mmh'?a/60:a,b,tmin,tmax};}
function weighted(rows,field){let total=0,sum=0;for(const r of rows){let a=range(r.share,'Part de surface (%)',0,100),c=range(r[field],field==='c'?'Coefficient C':'Part imperméable',0,1);total+=a;sum+=a*c;}if(Math.abs(total-100)>.01)throw Error('Les parts d’occupation du sol doivent totaliser 100 %.');return sum/100;}
function runoff(p,caquot=false){return p.cMode==='weighted'?weighted(p.land,caquot?'imp':'c'):range(caquot?p.cimp:p.c,caquot?'Coefficient d’imperméabilisation':'Coefficient de ruissellement',caquot?.2:0,1);}
function kirpich(p){let L=pos(p.length,'Kirpich : longueur du talweg (m)'),I=pos(p.slope,'Kirpich : pente du talweg (%)')/100;return pos(.0195*POW(L,.77)*POW(I,-.385),'Temps Kirpich (min)');}
function tc(p){if(p.tcMode==='kirpich')return kirpich(p);if(p.tcMode==='travel'){let t=0;for(const r of p.travel)t+=range(r.L,'Longueur du tronçon',0)/pos(r.v,'Vitesse du tronçon')/60;return pos(t,'Temps de concentration');}return pos(p.tc,'Temps de concentration');}
function rational(p,T){let A=area(p),C=runoff(p),t=tc(p),c=climate(p,T),m=null,i;
 if(p.intensityMode==='direct'){i=pos(c.i,'Intensité i(tc,T)');}else{m=montana(p,T);if(t<m.tmin||t>m.tmax)throw Error('tc = '+t.toFixed(2)+' min hors plage Montana ['+m.tmin+' ; '+m.tmax+'] min.');i=60*m.a*POW(t,-m.b);}
 let warnings=[];if(p.tcMode==='kirpich'){warnings.push('Kirpich : formule empirique pour un écoulement concentré. Le temps sur les versants doit être négligeable ou traité séparément ; aucun correctif de pente ou minimum de durée n’est appliqué.');if(num(p.slope,'Pente')<.2)warnings.push('Kirpich : pente < 0,2 %, estimation très sensible à la pente ; vérifier une méthode adaptée aux faibles pentes.');if(p.environment==='urban')warnings.push('Kirpich seul : vérifier la représentation des parcours de surface et du réseau urbain.');}if(A>80)warnings.push('Surface > 80 ha : dépassement du domaine conservateur HEC-22 retenu pour la méthode rationnelle.');if(p.environment==='rural'&&A>80)warnings.push('Pour ce bassin rural étendu, privilégier une étude pluie-débit adaptée.');
 return {Q:C*i*A/360,values:{'Surface (ha)':A,'C retenu':C,'tc (min)':t,'Intensité (mm/h)':i,'Hauteur sur tc (mm)':i*t/60,...(p.tcMode==='kirpich'?{'Méthode tc':'Kirpich','Longueur Kirpich (m)':num(p.length,'Longueur'),'Pente Kirpich (m/m)':num(p.slope,'Pente')/100}:{})},warnings,formula:'Q = C × i(tc,T) × A / 360'+(p.tcMode==='kirpich'?' ; tc [min] = 0,0195 × L [m]^0,77 × I [m/m]^(−0,385)':''),source:'Rationnelle · FHWA HEC-22, §3.2.2'};}
function caquot(p,T){let {A,slope,M}=geometry(p);if(A>200)throw Error('Caquot : surface limitée à 200 ha.');if(p.environment!=='urban')throw Error('Caquot est réservé ici aux bassins urbanisés.');if(slope<.002||slope>.05)throw Error('Caquot : pente admise de 0,2 à 5 %.');let C=runoff(p,true);if(C<.2)throw Error('Caquot : imperméabilisation minimale de 20 %.');let {a,b,tmin,tmax}=montana(p,T);
 let u=1-.287*b,v=.41*b,w=.95-.507*b,k=a*POW(.5,-b)/6.6,Mu=Math.max(.8,M),m=POW(Mu/2,-.84*b/u);
 let Q0=POW(k*POW(slope,v)*C*POW(A,w),1/u),Q=Q0*m;
 let t=.5*POW(Mu/2,.84)*POW(slope,-.41)*POW(A,.507)*POW(Q,-.287);
 if(t<tmin||t>tmax)throw Error('Caquot : durée calculée '+t.toFixed(2)+' min hors plage Montana ['+tmin+' ; '+tmax+'] min.');
 let warnings=['Caquot classique (IT 77). Les coefficients de pluie doivent être locaux ; son adaptation aux régimes tropicaux doit être justifiée.'];if(M<.8)warnings.push('Allongement M < 0,8 : M = 0,8 retenu, valeur minimale du modèle.');
 return {Q,values:{'Surface (ha)':A,'Imperméabilisation C':C,'Pente (m/m)':slope,'Allongement M calculé':M,'Allongement M retenu':Mu,'Montana a (mm/min, t en min)':a,'Montana b positif':b,'u':u,'v':v,'w':w,'k':k,'Débit brut Q0 (m³/s)':Q0,'Correction allongement m':m,'Durée Caquot (min)':t,'Intensité (mm/h)':60*a*POW(t,-b)},warnings,formula:'Q = [k × Iᵛ × C × Aʷ]¹/ᵘ × (M/2)^(−0,84b/u)',source:'Caquot classique · formulation IT 77, coefficients Montana locaux'};}
function reduction(p,S){if(p.arfMode==='manual')return range(p.arf,'Abattement spatial',.001,1);let pan=pos(p.pan,'Pluie annuelle Pan');if(S<1)return 1;let a=1-(161-.042*pan)*Math.log10(S)/1000;if(a<=0||a>1)throw Error('Abattement calculé non physique : saisir une valeur justifiée.');return a;}
const KR_TABLES={sahel:{k70:{PI:{15:[3650,51,27],7:[2636,41,23],3:[2239,39,22]},I:{15:[1455,33,21],7:[1140,30,20],3:[825,25,19]},RI:{15:[329,18.5,16.5],7:[239,17.7,14.5],3:[164,17,10.5]},P:{7:[131,13.8,5]},TP:{7:[35,5,1.5]}},k100:{PI:{15:[5528,69,28],7:[3656,51,26],3:[2727,44,25]},I:{15:[1833,38,24],7:[1476,37,22],3:[1125,32.5,20]},RI:{15:[421,20.5,17.5],7:[300,20,15],3:[250,20,12]},P:{15:[200,20,8],7:[150,20,6]},TP:{7:[67,14,2]}}},tropical:{k70:{I:{15:[2000,100,29.5],7:[1620,100,27.5],3:[1250,100,25]},RI:{15:[250,20,21.7],7:[200,20,18.5],3:[150,20,15]},P:{7:[50,15,8]},TP:{median:2}},k100:{I:{15:[2400,100,32],7:[1940,100,30],3:[1440,100,28]},RI:{15:[325,30,26],7:[240,30,22],3:[200,30,17]},P:{7:[55,17,9.5]},TP:{median:3}}}};
function revMix(p){if(p.revMixMode!=='weighted')return [{classe:p.perm,fraction:1}];let out=['PI','I','RI','P','TP'].map(c=>({classe:c,fraction:range(p['revShare'+c]??0,'Part '+c+' (%)',0,100)/100})).filter(r=>r.fraction>0);if(Math.abs(out.reduce((s,r)=>s+r.fraction,0)-1)>.000001)throw Error('Les parts d’infiltrabilité ORSTOM révisée doivent totaliser 100 %.');return out;}
function krClass(r,c,S,I,period){let rows=KR_TABLES[r]?.[period]?.[c];if(!rows)throw Error('Classe '+c+' non couverte par Kr automatique. Saisir Kr justifié.');if(rows.median!==undefined)return rows.median;let vals={};for(let [g,[a,b,c0]] of Object.entries(rows))vals[g]=a/(S+b)+c0;return interpolate(I,vals);}
function krAuto(p,S,I){let min=p.region==='sahel'?10:1;if(S<min||S>1500)throw Error('Kr automatique : '+min+' ≤ S ≤ 1500 km². Pour les petits bassins sahéliens ou Ig > 15, saisir Kr70/Kr100 lus sur les figures 9–10.');return ['k70','k100'].map(period=>revMix(p).reduce((v,r)=>v+r.fraction*krClass(p.region,r.classe,S,I,period),0));}
function logS(S,x0,x1,y0,y1){return lerp(Math.log(S),Math.log(x0),Math.log(x1),y0,y1);}
function permFraction(c){if(c==='RI')return .5;if(c==='P'||c==='TP')return 1;if(c==='I'||c==='PI')return 0;throw Error('Classe non couverte par les temps ORSTOM.');}
function tbSahelNode(g,S,c){let f=permFraction(c),small=(i,p)=>lerp(f,0,1,i,p);if(g===3)return S<7?215*POW(S-.5,.45)+300:250*POW(S,.35)+300;if(g===7)return S<6?small(13.9*S+255,19.6*S+218):126*POW(S,.35)+100;if(g===60){if(S>10)throw Error('Tb Ig = 60 : relation limitée ici à S ≤ 10 km².');return small(2.7*S+97,2.3*S+77);}let data={10:[8.9,183,165,25,81,80],15:[5,139,120,45,55,30],25:[4.1,116.5,101,100,42,20]}[g];let [a,bi,bp,limit,k,d]=data,t0=small(a*10+bi,a*10+bp);if(S<10)return small(a*S+bi,a*S+bp);if(S<limit)return logS(S,10,limit,t0,k*POW(limit,.35)+d);return k*POW(S,.35)+d;}
function tbAuto(p,S,I){if(S<1||S>1500)throw Error('Tb automatique : 1 ≤ S ≤ 1500 km².');if(p.region==='tropical'){let t={};for(let [g,[a,b]] of Object.entries({1:[560,400],3:[325,315],7:[163,142],10:[95,80],15:[75,55],25:[44,28],30:[35,20]}))t[g]=a*POW(S,.36)+b;return interpolate(I,t);}if(p.region!=='sahel')throw Error('Sélectionner le régime ORSTOM.');let mix=revMix(p),t={};for(let g of [3,7,10,15,25,...(S<=10?[60]:[])])t[g]=mix.reduce((v,r)=>v+r.fraction*tbSahelNode(g,S,r.classe),0);return interpolate(I,t);}
function correctedTb(p,S,I,kr100,base){let mode=p.revCorrMode||'auto';if(p.region!=='tropical')return {Tb:base,factor:1,note:'Tb sahélien, hydrogramme unitaire ou non selon S, Ig et infiltrabilité.'};if(mode==='manual'){let factor=range(p.revCorrFactor,'Facteur correctif Tb',1,5);if(!String(p.revCorrRef||'').trim())throw Error('Justifier le facteur correctif Tb tropical.');return {Tb:base*factor,factor,note:'Correction Tb tropicale saisie et justifiée.'};}let needed=S<15&&I>=12&&kr100>20;if(mode==='unitary'){if(needed&&!String(p.revCorrRef||'').trim())throw Error('Justifier l’absence de correction Tb sur ce petit bassin pentu et ruisselant.');return {Tb:base,factor:1,note:'Hypothèse unitaire retenue explicitement.'};}if(!needed)return {Tb:base,factor:1,note:'Pas de correction non unitaire déclenchée.'};if(S<2||S>10||I<15||I>30||kr100<=25)throw Error('Correction Tb tropicale : cas non encadré sans ambiguïté par les repères (S 2–10 km², Ig 15–30, Kr100 > 25 %). Saisir un facteur justifié ou choisir une hypothèse unitaire justifiée.');let c15=logS(S,2,10,1.4,1.2),c30=logS(S,2,10,1.6,1.3),factor=lerp(I,15,30,c15,c30);return {Tb:base*factor,factor,note:'Correction Tb : repères annexe 1 §2a1 ; interpolation log-linéaire en S et linéaire en Ig (convention de l’application).'};}
function tmSahelNode(g,S,c){let f=permFraction(c);if(g===3)return S<11?71*Math.sqrt(S-.5)+75:100*POW(S,.35)+75;let data={7:[2.5,60,6,32,23],15:[1.2,44,45,13,15],25:[1.02,33.8,100,9,10],60:[.45,27.5,10,0,0]}[g];let [a,b,limit,k,d]=data,smallLimit=g===7?6:10;if(S<smallLimit||g===60){if(g===60&&S>10)throw Error('Tm Ig60 hors domaine.');let reduction=0;if(f>0){let pts=g===7?{1:.10,5:.08}:g===15?{1:.15,5:.05,6:.04}:g===25?{1:.28,5:.18,6:.15}:{1:.30,5:.20,10:.18};reduction=interpolate(S,pts);}return (a*S+b)*(1-f*reduction);}if(S<limit){if(f>0)throw Error('Tm : raccord perméable non entièrement documenté à cette surface ; lecture graphique requise.');return logS(S,10,limit,a*10+b,k*POW(limit,.35)+d);}return k*POW(S,.35)+d;}
function tmRevised(p,S,I,Tb){if(p.region==='tropical')return .33*Tb;let t={};let nodes=[3,7,15,25,...(S<=10?[60]:[])];let lo=nodes.filter(g=>g<=I).at(-1),hi=nodes.find(g=>g>=I);if(lo===undefined||hi===undefined)throw Error('Tm : Ig hors domaine.');for(let g of new Set([lo,hi]))t[g]=revMix(p).reduce((v,r)=>v+r.fraction*tmSahelNode(g,S,r.classe),0);return interpolate(I,t);}
function revRet(p){let presets={sahelI:3,sahelP:6,tropSmallI:3,tropSmallP:5,tropLargeI:12.5,tropLargeP:17.5};let mode=p.revRetMode||'manual';if(mode==='manual')return range(p.ret,'Écoulement retardé (%)',0,100)/100;if(!(mode in presets))throw Error('Mode d’écoulement retardé non reconnu.');if(mode.startsWith('sahel')&&p.region!=='sahel'||mode.startsWith('trop')&&p.region!=='tropical')throw Error('Repère d’écoulement retardé incompatible avec le régime.');return presets[mode]/100;}

function orstom(p,T,classic=false){let S=area(p)/100,pan=pos(p.pan,'Pluie annuelle Pan'),P10=pos(climate(p,10).pj,'Pluie journalière P10'),PT=pos(climate(p,T).pj,'Pluie journalière P'+T);if(T<10)throw Error('ORSTOM : calcul disponible pour T ≥ 10 ans.');if(PT<P10)throw Error('La pluie de projet ne peut pas être inférieure à P10.');let A=reduction(p,S),Kr,Tb,I=null,kr70=null,kr100=null,warnings=[];
 let classicResult=null,revDetails={},revAlphaFactor=1;
 let sahelExtension = null;
if(classic){
  classicResult = Classic.parameters(p,S,{pos,range});
  if(classicResult.specific){
    sahelExtension = Classic.specificDischargeSahel(p,S,P10,reduction(p,120));
    sahelExtension.details['Abattement spatial à 120 km²'] = reduction(p,120);
    warnings.push(...classicResult.warnings);
    warnings.push('Extension sahélienne 120-200 km² : calcul en débit spécifique, interpolation Qspec(120) → Qspec(200) (Rodier & Auvray 1965, p. 27-28).');
  } else {
    Kr=classicResult.Kr; Tb=classicResult.Tb;
    warnings.push(...classicResult.warnings);
    if(S>120) warnings.push('Extension tropicale 120-200 km² : table Kr et coefficients de pointe du brief. Tb automatique utilise les ajustements existants, à vérifier sur le graphique 13 ; les valeurs saisies restent prioritaires.');
  }
  if(S<5||pan<150||pan>1600) warnings.push('Domaine historique dépassé ou peu documenté.');
}
 else{
  if((p.krMode==='auto'||p.tbMode==='auto')&&(p.region==='other'||pan<150||pan>1200||p.coastal))throw Error('Climat/littoral hors domaine ORSTOM automatique : utiliser des paramètres validés localement en mode saisi.');
  if((p.krMode==='auto'||p.tbMode==='auto')&&((p.region==='tropical'&&pan<850)||(p.region==='sahel'&&pan>850)))throw Error('Régime ORSTOM incompatible avec Pan : sahélien 150–850 mm, tropical sec 850–1200 mm.');
  I=ig(p);
  if(p.krMode==='auto')[kr70,kr100]=krAuto(p,S,I);else{kr70=range(p.kr70,'Kr70 (%)',.001,100);kr100=range(p.kr100,'Kr100 (%)',.001,100);}
  if(kr100<kr70)throw Error('Kr100 doit être au moins égal à Kr70.');Kr=(kr70+(kr100-kr70)*(P10-70)/30)/100;if(!(Kr>0&&Kr<=1))throw Error('Kr10 extrapolé hors [0 ; 1] : données ou modèle à revoir.');if(P10<70||P10>100)warnings.push('P10 hors [70 ; 100] mm : extrapolation linéaire de Kr10 à vérifier.');
  let baseTb=p.tbMode==='auto'?tbAuto(p,S,I):pos(p.tb,'Tb saisi (min)');
  let correction=p.tbMode==='auto'?correctedTb(p,S,I,kr100,baseTb):{Tb:baseTb,factor:1,note:'Tb final saisi : aucune correction supplémentaire appliquée.'};Tb=correction.Tb;
  revDetails['Tb avant correction (min)']=baseTb;revDetails['Facteur correctif Tb']=correction.factor;revDetails['Traitement de Tb']=correction.note;
  if(correction.factor>1){warnings.push(correction.note);if(p.revPeakAdjust!==false&&p.revCorrMode!=='manual'&&pos(p.alpha,'α')<3){revAlphaFactor=1.1;warnings.push('Annexe 1 §2a1 : coefficient de pointe majoré de 10 % pour la correction non unitaire automatique.');}}
  if(Math.abs(pos(p.alpha,'α')-2.6)>1e-9&&!String(p.revAlphaRef||p.manualRef||'').trim())throw Error('Justifier le coefficient de pointe différent de 2,6 (réseau hydrographique, annexe 1).');
  if(p.revMixMode==='weighted'){revDetails['Répartition des classes']=revMix(p).map(r=>r.classe+' : '+(r.fraction*100).toFixed(2)+' %').join(' ; ');warnings.push('Pondération par infiltrabilité : valable pour une répartition diffuse ; examiner le bassin réduit si les zones sont regroupées en amont ou en aval.');}
  if(p.region==='sahel'&&p.tbMode==='auto')warnings.push('Tb sahélien : interpolation linéaire en Ig, RI à mi-chemin entre I et P ; PI assimilé à I et TP à P pour les temps. Raccords en log(S) à 25, 45 et 100 km², choix dans les plages du manuel.');
  try{revDetails['Temps de montée Tm10 (min)']=tmRevised(p,S,I,Tb);}catch(e){revDetails['Temps de montée Tm10']=e.message;warnings.push('Tm indisponible dans ce cas ; le calcul de Q reste possible.');}
  if(p.krMode==='manual'||p.tbMode==='manual'){if(!String(p.manualRef||'').trim())throw Error('Indiquer la justification des paramètres ORSTOM saisis.');warnings.push('Paramètres ORSTOM saisis : le calage local et leur domaine d’emploi restent à justifier.');}
  if(S>120)warnings.push('Grand bassin : vérifier surface active, dégradation hydrographique et caractère unitaire de la crue.');
 }
 if(p.environment==='urban')warnings.push('Bassin urbanisé : la transposition des abaques ruraux ORSTOM nécessite une justification.');
 let alpha, ret = classic?range(p.ret,'Écoulement retardé (% du pic ruisselé)',0,100)/100:revRet(p);
let V, Qr, Q10, factor = 1;
let extraValues = {};

if(sahelExtension){
  if(Number(T) !== 10)
    throw Error('Extension sahélienne > 120 km² : uniquement disponible pour T=10. Pour T>10, étude spécifique requise.');
  Q10 = sahelExtension.Q10 * (1 + ret);
  alpha = null;
  extraValues = sahelExtension.details;
  extraValues['Écoulement retardé (m³/s)'] = sahelExtension.Q10 * ret;
  extraValues['Q10 total (m³/s)'] = Q10;
} else {
  alpha = classic ? classicResult.K : pos(p.alpha,'Coefficient de pointe α')*revAlphaFactor;
  V = 1000*A*P10*Kr*S;
  Qr = alpha*V/(60*Tb);
  Q10 = Qr*(1+ret);
}
 if(Number(T)!==10 && !sahelExtension){factor=1+(PT-P10)/P10*POW(Tb/1440,.12)/Kr;if(Number(T)!==100)warnings.push('Passage à Q'+T+' : extension de la relation publiée pour Q100 ; hypothèse de projet à justifier.');}
 if(!classic&&(p.coastal||pan>1200||p.region==='other'))warnings.push('Contexte hors domaine de la révision sahélienne/tropicale sèche : calcul conditionné à un calage local.');
 let values;
if(sahelExtension){
  values = {
    'Surface (km²)': S,
    'Pan (mm/an)': pan,
    'P10 ponctuelle (mm)': P10,
    'Abattement spatial': A,
    'P10 moyenne (mm)': A*P10,
    'Mode': 'Débit spécifique sahélien étendu (120-200 km²)',
    ...classicResult.values,
    ...extraValues
  };
} else {
  values = {
    'Surface (km²)': S,
    'Pan (mm/an)': pan,
    'P10 ponctuelle (mm)': P10,
    ['P'+T+' ponctuelle (mm)']: PT,
    'Abattement spatial': A,
    'P10 moyenne (mm)': A*P10,
    'Kr10 (%)': Kr*100,
    'Tb retenu (min)': Tb,
    'Coefficient de pointe α': alpha,
    'Volume ruisselé V10 (m³)': V,
    'Pic ruisselé Qr10 (m³/s)': Qr,
    'Écoulement retardé (m³/s)': Qr*ret,
    'Q10 total (m³/s)': Q10,
    'Facteur de passage CT': factor
  };
  if(I!==null) values['Ig (m/km)'] = I;
  if(kr70!==null){ values['Kr70 (%)']=kr70; values['Kr100 (%)']=kr100; }
  if(classicResult) Object.assign(values, classicResult.values);
}
 if(!classic){Object.assign(values,revDetails);values['Écoulement retardé retenu (%)']=ret*100;values['Coefficient de pointe avant correction']=pos(p.alpha,'α');values['Facteur correctif de pointe']=revAlphaFactor;values['Volume de crue Vc10 (m³)']=V+Qr*ret*Tb*60;values['Référence α']=p.revAlphaRef||p.manualRef||'Valeur usuelle 2,6';if(p.revRetMode&&p.revRetMode!=='manual')warnings.push('Écoulement retardé : repère sélectionné '+(ret*100)+' %, contexte à justifier ; les valeurs des grands bassins sont les milieux des fourchettes FAO.');}
 return {
  Q: Q10*factor,
  values,
  warnings,
  formula: sahelExtension
    ? 'Qspec(S) = Qspec(200) + [Qspec(120) − Qspec(200)] × (200 − S) / 80 ; Q10(S) = Qspec(S) × S / 1000'
    : 'Qr10 = 1000 × Aab × P10 × Kr10 × α × S / (60 × Tb) ; QT = CT × (Qr10 + Qret10)',
  source: sahelExtension
    ? 'ORSTOM classique étendu — débit spécifique sahélien (Rodier & Auvray 1965, p. 27)'
    : classic
      ? 'ORSTOM classique · numérisation {{PRODUCT.digitizer}} / paramètres justifiés'
      : 'ORSTOM révisée · FAO, Crues et apports, chap. 3'
};
}
const METHODS={rational:{name:'Rationnelle',fn:rational},caquot:{name:'Caquot',fn:caquot},revised:{name:'ORSTOM révisée',fn:(p,T)=>orstom(p,T)},classic:{name:'ORSTOM classique',fn:(p,T)=>orstom(p,T,true)}};
function calculate(p,T=p.T){let out={};for(let [id,m] of Object.entries(METHODS)){try{let r=m.fn(p,Number(T));if(!Number.isFinite(r.Q)||r.Q<0)throw Error('Résultat numérique non physique.');out[id]={id,name:m.name,ok:true,...r};}catch(e){out[id]={id,name:m.name,ok:false,error:e.message};}}return out;}
root.Hydro={KR_TABLES,revMix,krClass,tbSahelNode,correctedTb,tmRevised,revRet,num,kirpich,tc,area,geometry,ig,lerp,interpolate,montana,rational,caquot,orstom,krAuto,tbAuto,calculate,CLASSES,METHODS};if(typeof module!=='undefined')module.exports=root.Hydro;
})(typeof globalThis==='undefined'?window:globalThis);
