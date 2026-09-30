/* Moteur de calcul BCEOM — unités SI. */
(function(root){
  'use strict';
  const POLY=[-2.6213,12.192,-23.291,23.261,-10.876,4.3291,.0631];
  const poly=x=>POLY.reduce((v,c)=>v*x+c,0);
  const derivative=x=>POLY.slice(0,-1).reduce((v,c,i)=>v*x+c*(6-i),0);
  function bisect(fn,target,lo,hi){for(let i=0;i<75;i++){const m=(lo+hi)/2;if(fn(m)<target)lo=m;else hi=m;}return (lo+hi)/2;}
  let branch=0;for(let x=.001;x<10;x+=.001){if(derivative(x)<=0){branch=x-.001;break;}}

  function validate(p){
    for(const k of ['Q','B','D','N','Ks','g','slope','hlimit','fill','vmax','Bmax','Dmax','step'])
      if(typeof p[k]!=='number'||!Number.isFinite(p[k])) throw Error('Valeur numérique invalide : '+k);
    if(p.Q<=0||p.Q>1e6) throw Error('Le débit doit être strictement positif et inférieur ou égal à 1 000 000 m³/s.');
    if(p.B<.1||p.B>30||p.D<.1||p.D>20) throw Error('Dimensions hors limites : B de 0,1 à 30 m ; D de 0,1 à 20 m.');
    if(!Number.isInteger(p.N)||p.N<1||p.N>4) throw Error('Choisir de 1 à 4 cellules.');
    if(p.Ks<10||p.Ks>150||p.g<9||p.g>10) throw Error('Vérifier Ks (10–150) et g (9–10).');
    if(p.slope<=0||p.slope>.2) throw Error('La pente doit être comprise entre 0 et 20 %.');
    if(!['critical','fixed'].includes(p.slopeMode)) throw Error('Mode de pente invalide.');
    if(p.hlimit<=.0631||p.hlimit>1.25||p.fill<10||p.fill>100||p.vmax<=0||p.vmax>30) throw Error('Vérifier les limites H₁/D, remplissage et vitesse.');
    if(p.Bmax<1||p.Bmax>10||p.Dmax<1||p.Dmax>10||![.25,.5,1].includes(p.step)) throw Error('Catalogue : dimensions max. de 1 à 10 m, pas 0,25 / 0,50 / 1 m.');
    return p;
  }

  function critical(q,B,Ks,g){
    if(q<=0) return {yc:0,Ic:Infinity,qIc:0,Istar:Infinity};
    const qIc=q/Math.sqrt(g*B**5),
          Istar=qIc**(2/3)*(2+(1/qIc)**(2/3))**(4/3),
          Ic=Istar*g/(Ks**2*B**(1/3)),
          yc=(q*q/(g*B*B))**(1/3);
    return {yc,Ic,qIc,Istar};
  }

  const reduced=x=>x**(5/3)/(1+2*x)**(2/3);
  const manning=(y,B,Ks,I)=>y<=0?0:Ks*B*y*(B*y/(B+2*y))**(2/3)*Math.sqrt(I);

  function calculate(Q,B,D,N,p){
    const q=Q/N, c=critical(q,B,p.Ks,p.g),
          I=p.slopeMode==='critical'?c.Ic:p.slope,
          Afull=B*D, qH=q/(Afull*Math.sqrt(2*p.g*D)),
          hstar=qH<=branch?poly(qH):null,
          H1=hstar===null?null:hstar*D;
    const qV=q/(p.Ks*Math.sqrt(I)*B**(8/3));
    let hi=1; while(reduced(hi)<qV) hi*=2;
    const x=bisect(reduced,qV,0,hi), qResolved=reduced(x),
          vstar=(x/(1+2*x))**(2/3),
          y=x*B, V=vstar*p.Ks*Math.sqrt(I)*B**(2/3),
          R=B*y/(B+2*y), Fr=V/Math.sqrt(p.g*y), fill=y/D;
    const slopeOK = p.slopeMode==='critical' || I>=c.Ic*(1-1e-9),
          hOK = qH<=bisect(poly,p.hlimit,0,1),
          fillOK = fill<=p.fill/100*(1+1e-9),
          vOK = V<=p.vmax*(1+1e-9);
    const warnings=[];
    if(qH<.1935||qH>.4440) warnings.push('Q*H₁ hors du domaine d’emploi de l’abaque numérisé : extrapolation du polynôme, précision non garantie.');
    if(!hOK) warnings.push('Limite H₁/D dépassée ou polynôme hors branche croissante : section non retenue.');
    if(!slopeOK) warnings.push('I < Ic : régime fluvial. La relation amont BCEOM suppose un contrôle aval ; un calcul de remous est nécessaire.');
    if(y>D) warnings.push('Le tirant uniforme théorique dépasse la dalle. Les paramètres à surface libre ne décrivent plus un dalot couvert réel.');
    if(V>p.vmax) warnings.push('Vitesse supérieure au seuil : revoir la section, la pente ou les protections.');
    if(p.slopeMode==='critical') warnings.push('I = Ic (hypothèse BCEOM). La pente construite de l’ouvrage n’a pas été vérifiée.');
    return {Q,q,B,D,N,Afull,...c,I,qH,hstar,H1,qV,qResolved,x,vstar,y,V,R,Fr,fill,
            area:N*B*y,perimeter:N*(B+2*y),residual:qResolved/qV-1,
            slopeOK,hOK,fillOK,vOK,pass:slopeOK&&hOK&&fillOK&&vOK,warnings};
  }

  function capacity(B,D,N,p){
    const xh=bisect(poly,p.hlimit,0,1), qH=xh*B*D*Math.sqrt(2*p.g*D);
    let qF,qV,qSlope=Infinity,lower=0;
    if(p.slopeMode==='critical'){
      qF=B*Math.sqrt(p.g)*(D*p.fill/100)**1.5;
      qV=B*p.vmax**3/p.g;
    } else {
      const I=p.slope;
      qF=manning(D*p.fill/100,B,p.Ks,I);
      const rv=(p.vmax/(p.Ks*Math.sqrt(I)))**1.5;
      qV=rv>=B/2?Infinity:manning(rv*B/(B-2*rv),B,p.Ks,I);
      const yMin=B/6, qMin=B*Math.sqrt(p.g)*yMin**1.5,
            minI=critical(qMin,B,p.Ks,p.g).Ic;
      if(I<minI*(1-1e-12))
        return {Q:0,lower:0,reason:'Pente inférieure au minimum de la courbe Ic : aucun domaine compatible avec le contrôle amont.',limits:{head:N*qH,fill:N*qF,velocity:N*qV,slope:0}};
      lower=bisect(q=>-critical(q,B,p.Ks,p.g).Ic,-I,1e-15,qMin);
      let hi=qMin*2;
      while(critical(hi,B,p.Ks,p.g).Ic<I) hi*=2;
      qSlope=bisect(q=>critical(q,B,p.Ks,p.g).Ic,I,qMin,hi);
    }
    const lim={head:N*qH,fill:N*qF,velocity:N*qV,slope:N*qSlope},
          entries=Object.entries(lim),
          min=entries.reduce((a,b)=>a[1]<b[1]?a:b);
    if(min[1]<=N*lower*(1+1e-10))
      return {Q:0,lower:N*lower,reason:'Les contraintes de section ne recoupent pas le domaine I ≥ Ic.',limits:lim};
    return {Q:min[1],lower:N*lower,governing:min[0],limits:lim,reason:null};
  }

  function proposals(p){
    const groups=[];
    for(let N=1;N<=4;N++){
      let a=[];
      for(let bi=0;bi<=Math.round((p.Bmax-1)/p.step);bi++)
        for(let di=0;di<=Math.round((p.Dmax-1)/p.step);di++){
          const B=1+bi*p.step, D=1+di*p.step;
          if(B>p.Bmax+1e-8||D>p.Dmax+1e-8) continue;
          const r=calculate(p.Q,B,D,N,p);
          if(r.pass) a.push({...r,capacity:capacity(B,D,N,p)});
        }
      a.sort((a,b)=>a.N*a.B*a.D-b.N*b.B*b.D||a.B-b.B||a.H1-b.H1);
      groups.push(a.slice(0,3));
    }
    return groups;
  }

  root.BCEOM={poly,derivative,branch,bisect,validate,critical,reduced,manning,calculate,capacity,proposals};
})(typeof module!=='undefined'?module.exports:window);
