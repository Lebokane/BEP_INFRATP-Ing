  /* Dalots FHWA — moteur de calcul */
  (function(root){
    'use strict';
    const g=9.81, ku=1.811;
    function coeff(type,N){
      if(type==='parallel') return {K:.55,M:.64,c:.05,Y:.55,ke:.7,label:'Ailes parallèles, arête vive'};
      if(type==='bevel') return N===1 ? {K:.44,M:.74,c:.04,Y:.48,ke:.26,label:'Ailes 30°, chanfrein 45° — 1 cellule'} : {K:.47,M:.68,c:.04,Y:.62,ke:.32,label:'Ailes 30°, chanfrein 45° — 2 à 4 cellules'};
      return {K:.469,M:.696,c:.033,Y:.751,ke:.4,label:'Ailes 30–75°, arête vive'};
    }
    function bisect(fn,target,lo,hi){
      for(let i=0;i<65;i++){
        let mid=(lo+hi)/2;
        if(fn(mid)>target) hi=mid; else lo=mid;
      }
      return (lo+hi)/2;
    }
    function manning(B,y,n,S){
      if(y<=0) return 0;
      const A=B*y, R=A/(B+2*y);
      return A*Math.pow(R,2/3)*Math.sqrt(S)/n;
    }
    function transition(c,S){
      const Y=c.Y+.7*S;
      function f(x){ let slope=c.K*c.M*Math.pow(x,c.M-1), x2=slope/(2*c.c); return c.K*(1-c.M)*Math.pow(x,c.M)-Y+c.c*x2*x2; }
      let prev=.0001, fp=f(prev);
      for(let i=1;i<=500;i++){
        let x=.0001*Math.pow(1e6,i/500), fx=f(x);
        if(fp*fx<0){
          let a=prev,b=x;
          for(let j=0;j<60;j++){ let m=(a+b)/2; if(f(a)*f(m)<=0) b=m; else a=m; }
          let x1=(a+b)/2, m=c.K*c.M*Math.pow(x1,c.M-1), x2=m/(2*c.c);
          if(x1<x2) return {x1,x2,m,v:c.K*Math.pow(x1,c.M)};
        }
        prev=x; fp=fx;
      }
      const x1=Math.pow(1/c.K,1/c.M), x2=Math.sqrt((1.5-Y)/c.c);
      if(x2<=x1) throw Error('Configuration d’entrée hors domaine du raccordement.');
      return {x1,x2,v:1,m:c.K*c.M*Math.pow(x1,c.M-1),m2:2*c.c*x2,hermite:true};
    }
    const tc=new Map();
    function inlet(Q,B,D,N,p){
      if(Q<=0) return {hw:0,zone:'Sans débit'};
      let c=coeff(p.inlet,N), key=[p.inlet,N,p.S].join('|'), t=tc.get(key);
      if(!t){ t=transition(c,p.S); tc.set(key,t); }
      let x=ku*Q/(N*B*D*Math.sqrt(D));
      let h, zone;
      if(x<=t.x1){ h=c.K*Math.pow(x,c.M); zone='Entrée dénoyée'; }
      else if(x>=t.x2){ h=c.c*x*x+c.Y+.7*p.S; zone='Entrée noyée'; }
      else {
        if(t.hermite){
          let dx=t.x2-t.x1, u=(x-t.x1)/dx, delta=.5/dx, m1=Math.min(t.m,3*delta), m2=Math.min(t.m2,3*delta);
          h=(2*u**3-3*u*u+1)+(-2*u**3+3*u*u)*1.5+(u**3-2*u*u+u)*dx*m1+(u**3-u*u)*dx*m2;
        } else {
          h=t.v+t.m*(x-t.x1);
        }
        zone='Transition d’entrée';
      }
      return {hw:D*h, zone, x, c, t};
    }
    function heads(Q,B,D,N,p){
      const q=Q/N, A=B*D, R=A/(2*(B+D)), v=q/A, yc=Math.cbrt(q*q/(g*B*B));
      const ic=inlet(Q,B,D,N,p), c=coeff(p.inlet,N);
      const he=c.ke*v*v/(2*g), hf=p.n*p.n*p.L*v*v/Math.pow(R,4/3), hs=v*v/(2*g);
      const ho=Math.max(p.TW,(Math.min(yc,D)+D)/2), hwo=Math.max(0,ho+he+hf+hs-p.S*p.L);
      const hw=Math.max(ic.hw,hwo);
      return {
        hw, hwi:ic.hw, hwo,
        he, hf, hs, ho, yc,
        vfull:v, Rfull:R,
        zone:ic.zone,
        control:ic.hw>=hwo?'Entrée':'Sortie',
        lowOutlet:hwo<.75*D,
        fullTail:p.TW>=D
      };
    }
    function limits(p){ return Math.min(p.HW, p.crest-p.freeboard); }
    function capacity(B,D,N,p){
      let limit=limits(p);
      if(Math.max(0,p.TW-p.S*p.L)>=limit) return 0;
      let hi=Math.max(1,N*B*D);
      while(heads(hi,B,D,N,p).hw<limit && hi<1e7) hi*=2;
      return bisect(q=>heads(q,B,D,N,p).hw, limit, 0, hi);
    }
    function analyse(Q,B,D,N,p){
      const h=heads(Q,B,D,N,p), q=Q/N;
      let yn = q<=manning(B,D,p.n,p.S) ? bisect(y=>manning(B,y,p.n,p.S), q, 0, D) : null;
      let yout = h.control==='Entrée' ? Math.min(yn??D, h.yc, D) : Math.min(D, Math.max(h.yc, p.TW));
      yout=Math.max(yout,1e-9);
      const vout=q/(B*yout), fr=yout<D-1e-6 ? vout/Math.sqrt(g*yout) : null;
      const cap=capacity(B,D,N,p);
      const qfill=N*manning(B,D*p.fill/100,p.n,p.S);
      const service=p.freeFlow ? Math.min(cap,qfill) : cap;
      const y=yn;
      const A=y===null?null:N*B*y, P=y===null?null:N*(B+2*y), R=y===null?null:B*y/(B+2*y);
      const vn=y===null?null:Q/A, frn=y===null?null:vn/Math.sqrt(g*y);
      let warnings=[];
      if(Q>cap*(1+1e-7)) warnings.push('Niveau amont admissible dépassé : section insuffisante pour ce débit.');
      if(p.freeFlow && Q>qfill*(1+1e-7)) warnings.push('Le critère de présélection sur le tirant normal est dépassé.');
      if(h.lowOutlet && !h.fullTail) warnings.push('HW sortie < 0,75 D : approximation de sortie hors domaine conseillé. Calcul de remous requis.');
      if(h.hw>=D) warnings.push('Niveau amont au-dessus de la dalle : entrée submergée possible, sans préjuger du remplissage de tout le dalot.');
      if(vout>p.vmax) warnings.push('Vitesse de sortie estimée supérieure au seuil projet : étudier la dissipation et la protection aval.');
      if(vout<p.vmin) warnings.push('Vitesse de sortie estimée faible : examiner le risque de dépôts.');
      if(h.hw>=p.crest) warnings.push('Niveau de chaussée atteint : surverse possible, non calculée dans cette version.');
      if(p.TW>h.yc && p.TW<D) warnings.push('Influence aval possible : le tirant normal ne représente pas le profil réel.');
      if(B/D<1 || B/D>4) warnings.push('Rapport B/D hors plage 1 à 4 : confirmer les coefficients d’entrée pour cette géométrie.');
      if(p.S>.05) warnings.push('Forte pente : vérifier le profil, les ressauts et la dissipation avec un modèle détaillé.');
      return {...h, Q, B, D, N, yn, yout, vout, fr, A, P, R, vn, frn, cap, qfill, service, warnings, pass:Q<=service*(1+1e-7), revanche:p.crest-h.hw};
    }
    function propose(p){
      let groups=[];
      for(let N=1;N<=4;N++){
        let arr=[];
        for(let B=1;B<=p.Bmax+1e-8;B+=.5)
          for(let D=1;D<=p.Dmax+1e-8;D+=.5){
            if(B<D || B/D>4) continue;
            let h=heads(p.Q,B,D,N,p);
            if(h.hw>limits(p)+1e-8) continue;
            if(p.freeFlow && p.Q>N*manning(B,D*p.fill/100,p.n,p.S)+1e-8) continue;
            let r=analyse(p.Q,B,D,N,p);
            if(r.vout>p.vmax || r.vout<p.vmin) continue;
            arr.push(r);
          }
        arr.sort((a,b)=> a.N*a.B*a.D - b.N*b.B*b.D || a.N*a.B - b.N*b.B || a.hw - b.hw);
        groups.push(arr.slice(0,3));
      }
      return groups;
    }
    root.Hydro={g, coeff, manning, transition, inlet, heads, capacity, analyse, propose, limits};
  })(typeof module!=='undefined'?module.exports:window);
