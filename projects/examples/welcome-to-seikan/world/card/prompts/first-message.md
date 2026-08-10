<style>
.seikan-role-select,
.seikan-role-select *{
  box-sizing:border-box;
}
.seikan-role-select{
  position:relative;
  width:min(100%,620px);
  margin:14px auto;
  overflow:hidden;
  border:1px solid rgba(229,158,187,.76);
  border-radius:20px;
  background:
    radial-gradient(circle at 84% 0%,rgba(255,190,215,.48),transparent 38%),
    radial-gradient(circle at 0% 100%,rgba(218,204,255,.42),transparent 42%),
    linear-gradient(145deg,#fffafd 0%,#fff0f6 52%,#f7efff 100%);
  color:#513746;
  box-shadow:0 16px 38px rgba(151,91,119,.18),inset 0 1px 0 rgba(255,255,255,.92);
  font-family:Arial,"Noto Sans KR",sans-serif;
  -webkit-text-size-adjust:100%;
}
.seikan-role-select:before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(120deg,transparent 0 45%,rgba(255,255,255,.42) 48%,transparent 51% 100%);
}
.seikan-role-inner{
  position:relative;
  padding:clamp(14px,4vw,22px);
}
.seikan-role-head{
  text-align:center;
  padding-bottom:clamp(12px,3vw,17px);
  border-bottom:1px solid rgba(219,151,181,.34);
}
.seikan-role-kicker{
  font-size:clamp(8px,2.2vw,9px);
  letter-spacing:clamp(2px,.8vw,3.1px);
  color:#b77795;
  text-transform:uppercase;
}
.seikan-role-title{
  margin-top:5px;
  font-family:"Segoe Script","Snell Roundhand","Apple Chancery","Brush Script MT","URW Chancery L",cursive;
  font-size:clamp(30px,8vw,38px);
  font-weight:500;
  font-style:italic;
  line-height:1.05;
  color:#d6759d;
  background:linear-gradient(180deg,#c95f8d 0%,#e58aad 48%,#af6bc5 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow:0 1px 0 rgba(255,255,255,.8);
  filter:drop-shadow(0 3px 9px rgba(171,81,124,.24));
  transform:rotate(-2deg) skewX(-5deg);
}
.seikan-role-prompt{
  margin-top:8px;
  font-size:clamp(10px,2.8vw,12px);
  line-height:1.55;
  color:#765268;
}
.seikan-role-grid{
  display:flex !important;
  flex-direction:row !important;
  flex-wrap:nowrap !important;
  align-items:stretch !important;
  justify-content:space-between !important;
  gap:clamp(7px,2.2vw,12px);
  width:100%;
  margin-top:clamp(12px,3.4vw,16px);
}
.seikan-role-card{
  width:calc(50% - 4px) !important;
  max-width:calc(50% - 4px) !important;
  min-width:0 !important;
  flex:1 1 0 !important;
  display:flex !important;
  flex-direction:column !important;
  padding:clamp(10px,2.8vw,14px);
  border:1px solid rgba(225,171,195,.50);
  border-radius:15px;
  background:rgba(255,255,255,.68);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.86),0 7px 18px rgba(184,116,149,.08);
}
.seikan-role-logo{
  width:clamp(34px,10vw,44px);
  aspect-ratio:1;
  margin:0 auto clamp(7px,2vw,9px);
  display:grid;
  place-items:center;
  border:1px solid rgba(217,112,157,.45);
  border-radius:50%;
  background:linear-gradient(145deg,#ffe5f0,#eee6ff);
  color:#a1587a;
  font-size:clamp(8px,2.5vw,10px);
  font-weight:900;
  letter-spacing:.7px;
  box-shadow:0 5px 13px rgba(167,90,126,.12),inset 0 1px 0 rgba(255,255,255,.9);
}
.seikan-role-card-title{
  text-align:center;
  font-size:clamp(12px,3.3vw,14px);
  font-weight:900;
  line-height:1.3;
  color:#684254;
}
.seikan-role-card-sub{
  flex:1;
  margin-top:5px;
  min-height:46px;
  text-align:center;
  font-size:clamp(8.5px,2.45vw,10px);
  line-height:1.5;
  color:#967084;
  overflow-wrap:anywhere;
  word-break:keep-all;
}
.seikan-role-actions{
  margin-top:clamp(8px,2.4vw,11px);
}
.seikan-role-actions button{
  width:100%;
  min-height:44px;
  appearance:none;
  border:1px solid rgba(217,112,157,.52);
  border-radius:999px;
  background:linear-gradient(135deg,#ffe3ef,#eee5ff);
  padding:9px 8px;
  color:#8f4c6c;
  font-family:Arial,"Noto Sans KR",sans-serif;
  font-size:clamp(9px,2.6vw,11px);
  font-weight:900;
  line-height:1.25;
  letter-spacing:0;
  white-space:normal;
  overflow-wrap:anywhere;
  cursor:pointer;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
  box-shadow:0 4px 12px rgba(167,90,126,.13),inset 0 1px 0 rgba(255,255,255,.82);
  transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease;
}
@media(hover:hover){
  .seikan-role-actions button:hover{
    transform:translateY(-1px);
    border-color:#d96899;
    background:linear-gradient(135deg,#ffd4e6,#e4d8ff);
    box-shadow:0 7px 16px rgba(167,90,126,.18),inset 0 1px 0 rgba(255,255,255,.86);
  }
}
.seikan-role-actions button:active{
  transform:scale(.98);
  box-shadow:0 2px 7px rgba(167,90,126,.12);
}
.seikan-role-foot{
  margin-top:clamp(10px,3vw,14px);
  text-align:center;
  font-size:clamp(7.5px,2.2vw,8px);
  line-height:1.5;
  color:#a08190;
}
@media(max-width:380px){
  .seikan-role-select{border-radius:16px}
  .seikan-role-inner{padding:12px 10px}
  .seikan-role-grid{gap:6px}
  .seikan-role-card{width:calc(50% - 3px) !important;max-width:calc(50% - 3px) !important;padding:9px 6px;border-radius:12px}
  .seikan-role-logo{width:34px;font-size:7px;letter-spacing:.3px}
  .seikan-role-card-title{font-size:11px}
  .seikan-role-card-sub{min-height:54px;font-size:8px;line-height:1.38}
  .seikan-role-actions button{min-height:42px;padding:7px 4px;font-size:8.5px}
}
@media(max-width:320px){
  .seikan-role-inner{padding:10px 7px}
  .seikan-role-grid{gap:5px}
  .seikan-role-card{width:calc(50% - 2.5px) !important;max-width:calc(50% - 2.5px) !important;padding:8px 5px}
  .seikan-role-card-sub{min-height:0}
  .seikan-role-actions button{font-size:8px}
}
</style>

<div class="seikan-role-select">
  <div class="seikan-role-inner">
    <div class="seikan-role-head">
      <div class="seikan-role-kicker">SELECT YOUR ROLE</div>
      <div class="seikan-role-title">Seikan</div>
      <div class="seikan-role-prompt">이 채팅에서 플레이할 역할을 선택하세요.</div>
    </div>

    <div class="seikan-role-grid" style="display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;width:100% !important;align-items:stretch !important;gap:8px !important;">
      <div class="seikan-role-card" style="display:flex !important;flex-direction:column !important;flex:1 1 0 !important;width:calc(50% - 4px) !important;max-width:calc(50% - 4px) !important;min-width:0 !important;">
        <div class="seikan-role-logo">OWNER</div>
        <div class="seikan-role-card-title">점장 모드</div>
        <div class="seikan-role-card-sub">가게를 운영하며 손님을 직접 맞이합니다.</div>
        <div class="seikan-role-actions">{{button::점주로 시작::select_role_owner}}</div>
      </div>

      <div class="seikan-role-card" style="display:flex !important;flex-direction:column !important;flex:1 1 0 !important;width:calc(50% - 4px) !important;max-width:calc(50% - 4px) !important;min-width:0 !important;">
        <div class="seikan-role-logo">GUEST</div>
        <div class="seikan-role-card-title">손님 모드</div>
        <div class="seikan-role-card-sub">방문 손님이 되어 남자 점주의 응대를 받습니다.</div>
        <div class="seikan-role-actions">{{button::손님으로 시작::select_role_customer}}</div>
      </div>
    </div>

    <div class="seikan-role-foot">선택한 역할은 이 채팅 동안 유지됩니다.</div>
  </div>
</div>