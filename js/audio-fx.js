// ═══════════════════════════════════════════════════════════
// AUDIO FX — Web Audio API Synthesizer
// ═══════════════════════════════════════════════════════════
export const SFX=(()=>{
  let ctx=null;
  function ensure(){
    if(!ctx)try{ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }
  function play(fn){try{const c=ensure();if(c)fn(c);}catch(e){}}

  // ── Tiny synth helpers ──
  function tone(c,freq,dur,type='sine',vol=.12,decay=dur){
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(vol,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,c.currentTime+decay);
    o.connect(g);g.connect(c.destination);
    o.start(c.currentTime);o.stop(c.currentTime+dur);
  }
  function noise(c,dur,vol=.06){
    const buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
    s.buffer=buf;f.type='highpass';f.frequency.value=3000;
    g.gain.setValueAtTime(vol,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);
    s.connect(f);f.connect(g);g.connect(c.destination);
    s.start();s.stop(c.currentTime+dur);
  }

  return{
    // UI click – short bright tick
    click(){play(c=>{tone(c,1800,.06,'square',.06,.06);});},
    // Tab switch – soft two-note blip
    tab(){play(c=>{tone(c,800,.05,'sine',.08,.05);tone(c,1200,.07,'sine',.06,.07);});},
    // Hover – ultra subtle
    hover(){play(c=>{tone(c,2400,.03,'sine',.03,.03);});},
    // Select / pick option – satisfying pop
    select(){play(c=>{
      tone(c,600,.04,'sine',.12,.04);
      setTimeout(()=>tone(c,900,.06,'sine',.1,.06),30);
    });},
    // Deselect
    deselect(){play(c=>{tone(c,500,.04,'sine',.06,.04);});},
    // Place bet – coin clink
    betPlace(){play(c=>{
      tone(c,1400,.05,'square',.1,.05);
      setTimeout(()=>{tone(c,2100,.06,'square',.08,.06);noise(c,.03,.04);},50);
      setTimeout(()=>tone(c,2800,.08,'sine',.07,.08),100);
    });},
    // Win – triumphant ascending arpeggio
    win(){play(c=>{
      [523,659,784,1047].forEach((f,i)=>{
        setTimeout(()=>tone(c,f,.15,'sine',.12,.15),i*80);
      });
      setTimeout(()=>noise(c,.08,.05),340);
    });},
    // Big win – major chord fanfare
    bigWin(){play(c=>{
      [523,659,784].forEach(f=>tone(c,f,.3,'sine',.1,.3));
      setTimeout(()=>{
        [659,784,1047].forEach(f=>tone(c,f,.3,'sine',.1,.3));
      },250);
      setTimeout(()=>{
        [784,1047,1319].forEach(f=>tone(c,f,.5,'sine',.12,.5));
        noise(c,.12,.06);
      },500);
    });},
    // Loss – descending minor
    lose(){play(c=>{
      tone(c,440,.15,'triangle',.1,.15);
      setTimeout(()=>tone(c,370,.15,'triangle',.08,.15),120);
      setTimeout(()=>tone(c,330,.25,'triangle',.07,.25),240);
    });},
    // Push/refund – neutral
    push(){play(c=>{
      tone(c,600,.1,'sine',.08,.1);
      setTimeout(()=>tone(c,600,.1,'sine',.06,.1),120);
    });},
    // Tier up – epic fanfare
    tierUp(){play(c=>{
      noise(c,.06,.04);
      [523,659,784,1047,1319].forEach((f,i)=>{
        setTimeout(()=>tone(c,f,.2+(i*.05),'sine',.1+i*.01,.2+i*.05),i*70);
      });
      setTimeout(()=>{
        [1047,1319,1568].forEach(f=>tone(c,f,.4,'sine',.1,.4));
        noise(c,.15,.05);
      },400);
    });},
    // Coin add – cha-ching
    coins(){play(c=>{
      tone(c,3200,.04,'square',.07,.04);
      setTimeout(()=>tone(c,4200,.06,'square',.05,.06),40);
    });},
    // Navigate – soft whoosh
    nav(){play(c=>{noise(c,.08,.04);tone(c,400,.05,'sine',.04,.05);});},
    // Sim match – dramatic drum
    sim(){play(c=>{
      noise(c,.08,.08);
      tone(c,120,.12,'triangle',.12,.12);
      setTimeout(()=>{noise(c,.06,.06);tone(c,150,.1,'triangle',.1,.1);},80);
    });},
    // Error / warning
    error(){play(c=>{
      tone(c,200,.12,'sawtooth',.08,.12);
      setTimeout(()=>tone(c,180,.15,'sawtooth',.06,.15),80);
    });},
    // Formation change
    formation(){play(c=>{
      tone(c,700,.05,'sine',.07,.05);
      setTimeout(()=>tone(c,900,.05,'sine',.07,.05),60);
      setTimeout(()=>tone(c,700,.05,'sine',.05,.05),120);
    });},
    // Lock prediction
    lock(){play(c=>{
      tone(c,800,.06,'square',.09,.06);
      setTimeout(()=>tone(c,1200,.08,'square',.07,.08),80);
      setTimeout(()=>tone(c,1600,.12,'sine',.08,.12),160);
    });},
    // Calendar tick
    calTick(){play(c=>{tone(c,1600,.02,'sine',.04,.02);});},
    // Reward scratch/reveal — building tension
    rewardReveal(){play(c=>{
      for(let i=0;i<6;i++){
        setTimeout(()=>tone(c,800+i*120,.06,'square',.04+i*.01,.06),i*50);
      }
      setTimeout(()=>{noise(c,.04,.03);},300);
    });},
    // Reward claimed — satisfying unlock
    rewardClaim(){play(c=>{
      tone(c,523,.08,'sine',.1,.08);
      setTimeout(()=>tone(c,659,.08,'sine',.1,.08),80);
      setTimeout(()=>tone(c,784,.1,'sine',.12,.1),160);
      setTimeout(()=>{
        [784,988,1175].forEach(f=>tone(c,f,.25,'sine',.08,.25));
        noise(c,.1,.04);
      },260);
    });},
    // Epic/Legendary reward — slot machine jackpot
    rewardJackpot(){play(c=>{
      noise(c,.1,.06);
      [523,659,784].forEach(f=>tone(c,f,.3,'sine',.1,.3));
      setTimeout(()=>{
        [659,784,1047].forEach(f=>tone(c,f,.35,'sine',.12,.35));
        noise(c,.08,.05);
      },280);
      setTimeout(()=>{
        [784,1047,1319,1568].forEach((f,i)=>{
          setTimeout(()=>tone(c,f,.3+(i*.06),'sine',.1+i*.02,.3+i*.06),i*60);
        });
        setTimeout(()=>noise(c,.18,.07),240);
      },580);
    });},
    // VS Compare — dramatic fighting-game style hit
    versus(){play(c=>{
      noise(c,.1,.1);
      tone(c,200,.15,'sawtooth',.15,.15);
      tone(c,400,.15,'square',.1,.15);
      setTimeout(()=>{
        noise(c,.08,.08);
        tone(c,600,.2,'sawtooth',.15,.2);
        tone(c,800,.2,'square',.12,.2);
        tone(c,1200,.25,'sine',.08,.25);
      },150);
    });},
    // Chip rain — coins cascading
    chipRain(){play(c=>{
      for(let i=0;i<8;i++){
        setTimeout(()=>{
          tone(c,2200+Math.random()*1500,.04,'square',.05,.04);
        },i*45);
      }
    });},
    // Gift box wobble — anticipation rattle
    giftShake(){play(c=>{
      for(let i=0;i<8;i++){
        setTimeout(()=>{
          tone(c,300+Math.random()*200,.03,'square',.04+i*.005,.03);
          if(i%2===0)noise(c,.02,.02);
        },i*60);
      }
    });},
    // Gift lid pop — explosive burst
    giftPop(){play(c=>{
      noise(c,.15,.15);
      tone(c,200,.1,'sawtooth',.2,.1);
      tone(c,400,.08,'square',.15,.08);
      setTimeout(()=>{
        tone(c,800,.06,'sine',.12,.06);
        tone(c,1200,.06,'sine',.1,.06);
        noise(c,.08,.1);
      },60);
      setTimeout(()=>{
        tone(c,1600,.1,'sine',.08,.1);
        tone(c,2400,.08,'sine',.06,.08);
      },120);
    });},
    // Light burst whoosh — sweeping reveal
    revealWhoosh(){play(c=>{
      // Low sweep
      const o=c.createOscillator(),g=c.createGain();
      o.type='sawtooth';
      o.frequency.setValueAtTime(100,c.currentTime);
      o.frequency.exponentialRampToValueAtTime(2000,c.currentTime+.4);
      g.gain.setValueAtTime(.08,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.5);
      o.connect(g);g.connect(c.destination);
      o.start();o.stop(c.currentTime+.5);
      // White noise swell
      noise(c,.3,.08);
      setTimeout(()=>noise(c,.15,.04),150);
    });},
    // Reward rise — magical ascending shimmer
    rewardRise(){play(c=>{
      const notes=[523,659,784,1047,1319,1568];
      notes.forEach((f,i)=>{
        setTimeout(()=>{
          tone(c,f,.12+(i*.02),'sine',.06+i*.01,.12+i*.02);
          if(i%2===0)tone(c,f*1.5,.06,'sine',.03,.06);
        },i*55);
      });
      setTimeout(()=>{
        noise(c,.1,.04);
        tone(c,1568,.3,'sine',.08,.3);
        tone(c,2093,.25,'sine',.06,.25);
      },330);
    });},
    // Legendary mega fanfare — multi-layered epic
    legendaryReveal(){play(c=>{
      // Thunder hit
      noise(c,.2,.18);
      tone(c,80,.2,'sawtooth',.15,.2);
      // Dramatic pause then ascending power chord
      setTimeout(()=>{
        [261,329,392].forEach(f=>tone(c,f,.4,'sine',.12,.4));
        noise(c,.05,.06);
      },250);
      setTimeout(()=>{
        [329,415,523].forEach(f=>tone(c,f,.4,'sine',.14,.4));
        noise(c,.06,.06);
      },500);
      setTimeout(()=>{
        [392,523,659,784].forEach((f,i)=>{
          setTimeout(()=>tone(c,f,.5+i*.08,'sine',.12+i*.02,.5+i*.08),i*50);
        });
        setTimeout(()=>{
          [784,1047,1319,1568].forEach(f=>tone(c,f,.6,'sine',.1,.6));
          noise(c,.25,.08);
        },200);
      },750);
    });},
    // Epic reveal — powerful but slightly shorter
    epicReveal(){play(c=>{
      noise(c,.12,.12);
      tone(c,150,.15,'sawtooth',.12,.15);
      setTimeout(()=>{
        [392,523,659].forEach(f=>tone(c,f,.35,'sine',.1,.35));
        noise(c,.06,.05);
      },180);
      setTimeout(()=>{
        [523,659,784,1047].forEach((f,i)=>{
          setTimeout(()=>tone(c,f,.4,'sine',.1+i*.015,.4),i*45);
        });
        noise(c,.15,.06);
      },450);
    });},
    // Coin shower — long cascading coins for collection
    coinShower(){play(c=>{
      for(let i=0;i<16;i++){
        setTimeout(()=>{
          tone(c,1800+Math.random()*2000,.05,'square',.04+Math.random()*.03,.05);
          if(i%3===0)noise(c,.02,.02);
        },i*50+Math.random()*30);
      }
    });},
    // Magic sparkle — twinkling fairy dust
    sparkle(){play(c=>{
      for(let i=0;i<5;i++){
        setTimeout(()=>{
          tone(c,2000+Math.random()*2500,.08,'sine',.03+Math.random()*.02,.08);
        },i*80+Math.random()*40);
      }
    });},
  };
})();
