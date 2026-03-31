/**
 * TiffinBox — Multi-Provider Tiffin Platform
 * ─────────────────────────────────────────────────────────────
 * • No PhonePe (Cash on Delivery for now — add PhonePe later)
 * • Multi-provider: each provider has their own login/menu/orders
 * • Single Google Sheet, single Vercel app — zero cost
 * • Customers pick a provider when signing up
 */

import { useState, useEffect, createContext, useContext } from "react";

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const CFG = {
  SCRIPT_URL:      "/api/sheets",
  PROVIDER_MOBILE: "9876500000",   // ← YOUR mobile number (provider login)
  APP_NAME:        "YourBrandName",
  DEMO_USER:       { mobile: "9999999999", password: "1234" },
};
```

/* ═══════════════════════════════════════════════════════════════
   API
═══════════════════════════════════════════════════════════════ */
async function api(action, body = {}) {
  const res = await fetch(CFG.SCRIPT_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ action, ...body }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════
   AUTH CONTEXT
═══════════════════════════════════════════════════════════════ */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA  (used when Google Sheet not yet connected)
═══════════════════════════════════════════════════════════════ */
const DEMO_PROVIDERS = [
  { provider_id:"P001", name:"Amma's Kitchen",     area:"Koramangala",  phone:"9900000001" },
  { provider_id:"P002", name:"Ramu Tiffin Centre", area:"Indiranagar",  phone:"9900000002" },
  { provider_id:"P003", name:"Lakshmi Foods",      area:"Marathahalli", phone:"9900000003" },
];

const DEMO_MENU = [
  { id:"m1", name:"Dal Tadka + Rice",            desc:"Yellow dal, basmati rice, papad",            price:80,  category:"Lunch",  veg:true,  available:true },
  { id:"m2", name:"Paneer Butter Masala + Roti", desc:"Creamy paneer curry, 3 rotis, salad",        price:110, category:"Lunch",  veg:true,  available:true },
  { id:"m3", name:"Rajma Chawal",                desc:"Kidney bean curry with steamed rice",        price:75,  category:"Lunch",  veg:true,  available:true },
  { id:"m4", name:"Full Thali",                  desc:"Rice, roti×3, 2 sabzis, dal, curd, pickle",  price:130, category:"Lunch",  veg:true,  available:true },
  { id:"m5", name:"Aloo Sabzi + Roti",           desc:"Home-style potato curry, 4 rotis",           price:60,  category:"Dinner", veg:true,  available:true },
  { id:"m6", name:"Chole Bhature",               desc:"Spiced chickpeas, 2 bhaturas",               price:90,  category:"Dinner", veg:true,  available:true },
];

const DEMO_ORDERS = [
  { order_id:"ORD001", customer_name:"Rahul Kumar",  mobile:"9876543210", items:'[{"name":"Dal Tadka + Rice","qty":1,"price":80}]',            total:80,  status:"pending",         payment_status:"cod",  address:"12 Gandhi Nagar", created_at:"Today, 12:05 PM", note:"",            provider_id:"P001" },
  { order_id:"ORD002", customer_name:"Priya Sharma", mobile:"9876543211", items:'[{"name":"Paneer Butter Masala + Roti","qty":2,"price":110}]', total:220, status:"confirmed",        payment_status:"plan", address:"45 Park Street",  created_at:"Today, 11:50 AM",note:"Less spicy",  provider_id:"P001" },
  { order_id:"ORD003", customer_name:"Amit Singh",   mobile:"9876543212", items:'[{"name":"Full Thali","qty":1,"price":130}]',                 total:130, status:"out_for_delivery", payment_status:"cod",  address:"7 Lake View Apt", created_at:"Today, 11:20 AM",note:"",            provider_id:"P001" },
  { order_id:"ORD004", customer_name:"Neha Gupta",   mobile:"9876543213", items:'[{"name":"Rajma Chawal","qty":1,"price":75}]',               total:75,  status:"delivered",        payment_status:"plan", address:"3 Rose Garden",   created_at:"Today, 10:45 AM",note:"",            provider_id:"P001" },
];

/* ═══════════════════════════════════════════════════════════════
   SHARED UI
═══════════════════════════════════════════════════════════════ */
const Loader = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200}}>
    <div className="spin-ring"/>
  </div>
);

const VegDot = ({ veg }) => (
  <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
    width:14,height:14,borderRadius:2,border:`2px solid ${veg?"#2d7a22":"#c0392b"}`,flexShrink:0}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:veg?"#2d7a22":"#c0392b",display:"block"}}/>
  </span>
);

const STATUS_MAP = {
  pending:          {bg:"#fff7e0",color:"#b7791f",label:"⏳ Pending"      },
  confirmed:        {bg:"#e8f4fd",color:"#2b6cb0",label:"✅ Confirmed"    },
  preparing:        {bg:"#f3e8ff",color:"#6b21a8",label:"👨‍🍳 Preparing"   },
  out_for_delivery: {bg:"#fff3e0",color:"#c05621",label:"🚴 On the Way"   },
  delivered:        {bg:"#e8f5e9",color:"#2e7d32",label:"📦 Delivered"    },
  cancelled:        {bg:"#fde8e8",color:"#b91c1c",label:"❌ Cancelled"    },
};
const StatusBadge = ({status}) => {
  const s = STATUS_MAP[status]||STATUS_MAP.pending;
  return <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{s.label}</span>;
};

const inputSt = {width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid #e8e8e8",fontSize:13,fontFamily:"'Poppins',sans-serif",color:"#333",marginBottom:12,boxSizing:"border-box",outline:"none"};
const cardSt  = {background:"#fff",borderRadius:16,padding:"14px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"};
const secLbl  = {fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:.5,textTransform:"uppercase",marginBottom:10};
const qtyBtnSt= {padding:"5px 10px",background:"transparent",border:"none",cursor:"pointer",fontSize:16,fontWeight:800,color:"#e74c3c",fontFamily:"inherit"};

/* ═══════════════════════════════════════════════════════════════
   LOGIN / REGISTER
═══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [tab,       setTab]      = useState("login");
  const [mobile,    setMobile]   = useState("");
  const [password,  setPassword] = useState("");
  const [name,      setName]     = useState("");
  const [address,   setAddress]  = useState("");
  const [provId,    setProvId]   = useState("");
  const [providers, setProviders]= useState(DEMO_PROVIDERS);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState("");

  useEffect(()=>{
    api("getProviders").then(r=>{ if(r.providers?.length) setProviders(r.providers); }).catch(()=>{});
  },[]);

  const submit = async () => {
    setError("");
    if (mobile.length!==10)             { setError("Enter a valid 10-digit mobile number"); return; }
    if (password.length<4)              { setError("Password must be at least 4 characters"); return; }
    if (tab==="register"&&!name.trim()) { setError("Please enter your name"); return; }
    if (tab==="register"&&!provId)      { setError("Please select your tiffin provider"); return; }
    setLoading(true);
    try {
      const body = tab==="register"
        ? {mobile, password, name:name.trim(), address:address.trim(), provider_id:provId}
        : {mobile, password};
      const res = await api(tab==="register"?"register":"login", body);
      if(res.success){ localStorage.setItem("tb_user",JSON.stringify(res.user)); onLogin(res.user); }
      else setError(res.message||"Incorrect mobile or password");
    } catch {
      /* ── Offline demo fallback ── */
      const prov = DEMO_PROVIDERS.find(p=>p.phone===mobile);
      if(prov && password==="1234"){
        const u={mobile,name:prov.name,isProvider:true,provider_id:prov.provider_id};
        localStorage.setItem("tb_user",JSON.stringify(u)); onLogin(u); setLoading(false); return;
      }
      if(tab==="register"){
        const u={mobile,name,address,provider_id:provId,
          provider_name:providers.find(p=>p.provider_id===provId)?.name||"",plan_type:null,plan_end:null};
        localStorage.setItem("tb_user",JSON.stringify(u)); onLogin(u);
      } else {
        const u={mobile,name:"Demo User",address:"123 Demo Street",
          provider_id:DEMO_PROVIDERS[0].provider_id,provider_name:DEMO_PROVIDERS[0].name,plan_type:null,plan_end:null};
        localStorage.setItem("tb_user",JSON.stringify(u)); onLogin(u);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#c0392b,#e74c3c 45%,#f39c12)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:"24px 20px",fontFamily:"'Poppins',sans-serif"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:56}}>🍱</div>
        <h1 style={{color:"#fff",fontSize:30,fontWeight:800,margin:"8px 0 4px",letterSpacing:-0.5}}>{CFG.APP_NAME}</h1>
        <p style={{color:"rgba(255,255,255,0.82)",fontSize:13}}>Fresh home-cooked tiffin, every day</p>
      </div>
      <div style={{background:"#fff",borderRadius:24,padding:"28px 24px",width:"100%",maxWidth:380,boxShadow:"0 24px 60px rgba(0,0,0,0.22)"}}>
        <div style={{display:"flex",background:"#f5f5f5",borderRadius:12,padding:4,marginBottom:24}}>
          {["login","register"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError("");}}
              style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",
                fontSize:13,fontWeight:600,transition:"all .2s",
                background:tab===t?"#e74c3c":"transparent",color:tab===t?"#fff":"#888"}}>
              {t==="login"?"Login":"Register"}
            </button>
          ))}
        </div>
        {error&&<div style={{background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:12,padding:"10px 14px",color:"#c53030",fontSize:12,marginBottom:14,whiteSpace:"pre-line",lineHeight:1.6}}>{error}</div>}
        {tab==="register"&&<>
          <input style={inputSt} placeholder="Full Name *" value={name} onChange={e=>setName(e.target.value)}/>
          <input style={inputSt} placeholder="Delivery Address" value={address} onChange={e=>setAddress(e.target.value)}/>
          <select style={{...inputSt,color:provId?"#333":"#aaa"}} value={provId} onChange={e=>setProvId(e.target.value)}>
            <option value="">— Select your Tiffin Provider *</option>
            {providers.map(p=><option key={p.provider_id} value={p.provider_id}>{p.name} · {p.area}</option>)}
          </select>
        </>}
        <input style={inputSt} placeholder="Mobile Number (10 digits)" type="tel" maxLength={10}
          value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g,""))}/>
        <input style={inputSt} placeholder="Password (min 4 characters)" type="password"
          value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <button onClick={submit} disabled={loading}
          style={{width:"100%",padding:"13px 0",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:15,fontWeight:700,color:"#fff",marginTop:4,
            background:loading?"#bbb":"linear-gradient(90deg,#e74c3c,#f39c12)",
            boxShadow:loading?"none":"0 4px 16px rgba(231,76,60,0.4)"}}>
          {loading?"Please wait…":tab==="login"?"Login →":"Create Account →"}
        </button>
      </div>
      <p style={{color:"rgba(255,255,255,0.6)",fontSize:11,marginTop:20,textAlign:"center",lineHeight:1.9}}>
        🧪 Test customer: any number / 1234{"\n"}🍳 Test provider: 9900000001 / 1234
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER — MENU
═══════════════════════════════════════════════════════════════ */
function MenuPage({ cart, setCart }) {
  const { user }            = useAuth();
  const [menu,    setMenu]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const hasPlan = user?.plan_end && new Date(user.plan_end)>=new Date();
  const today   = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  useEffect(()=>{
    const date=new Date().toISOString().split("T")[0];
    api("getMenu",{date,provider_id:user.provider_id})
      .then(r=>setMenu(r.menu?.length?r.menu:DEMO_MENU))
      .catch(()=>setMenu(DEMO_MENU))
      .finally(()=>setLoad(false));
  },[]);

  const getQty  = id   => cart.find(c=>c.id===id)?.qty||0;
  const addItem = item => setCart(p=>{const e=p.find(c=>c.id===item.id);return e?p.map(c=>c.id===item.id?{...c,qty:c.qty+1}:c):[...p,{...item,qty:1}];});
  const remItem = item => setCart(p=>{const e=p.find(c=>c.id===item.id);if(!e||e.qty<=1)return p.filter(c=>c.id!==item.id);return p.map(c=>c.id===item.id?{...c,qty:c.qty-1}:c);});

  if(loading) return <Loader/>;
  const cats=[...new Set(menu.map(i=>i.category))];

  return (
    <div style={{paddingBottom:16}}>
      <div style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)",padding:"20px 16px 24px"}}>
        <p style={{color:"rgba(255,255,255,0.75)",fontSize:11,marginBottom:2}}>{today}</p>
        <h2 style={{color:"#fff",fontSize:20,fontWeight:800,margin:"0 0 2px"}}>{user?.provider_name||"Today's Menu"} 🍛</h2>
        <p style={{color:"rgba(255,255,255,0.7)",fontSize:12,margin:0}}>Fresh home-cooked tiffin</p>
        {hasPlan&&<div style={{marginTop:10,background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"5px 12px",display:"inline-block",fontSize:12,color:"#fff",fontWeight:600}}>✅ Plan Active — Free Unlimited Orders!</div>}
      </div>
      {cats.map(cat=>{
        const items=menu.filter(i=>i.category===cat&&i.available!==false&&i.available!=="FALSE");
        if(!items.length) return null;
        return (
          <div key={cat}>
            <div style={{padding:"14px 16px 6px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:700,color:"#777",letterSpacing:.8,textTransform:"uppercase"}}>{cat}</span>
              <div style={{flex:1,height:1,background:"#ebebeb"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 12px"}}>
              {items.map(item=>{
                const qty=getQty(item.id);
                return (
                  <div key={item.id} style={{background:"#fff",borderRadius:18,padding:"14px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",display:"flex",gap:12,border:"1px solid #f0f0f0"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <VegDot veg={item.veg}/><span style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{item.name}</span>
                      </div>
                      <p style={{fontSize:12,color:"#888",margin:"0 0 10px",lineHeight:1.5}}>{item.desc}</p>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:16,fontWeight:800,color:"#1a1a1a"}}>₹{item.price}</span>
                        {qty===0
                          ?<button onClick={()=>addItem(item)} style={{border:"2px solid #e74c3c",color:"#e74c3c",background:"#fff",borderRadius:10,padding:"5px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>ADD</button>
                          :<div style={{display:"flex",alignItems:"center",border:"2px solid #e74c3c",borderRadius:10,overflow:"hidden"}}>
                            <button onClick={()=>remItem(item)} style={qtyBtnSt}>−</button>
                            <span style={{minWidth:28,textAlign:"center",fontSize:14,fontWeight:800,color:"#e74c3c"}}>{qty}</span>
                            <button onClick={()=>addItem(item)} style={qtyBtnSt}>+</button>
                          </div>
                        }
                      </div>
                    </div>
                    <div style={{width:76,height:76,borderRadius:14,flexShrink:0,background:"linear-gradient(135deg,#fff3e0,#ffe0b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>
                      {item.veg?"🥘":"🍗"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER — CART  (Cash on Delivery — no PhonePe yet)
═══════════════════════════════════════════════════════════════ */
function CartPage({ cart, setCart, onOrderPlaced }) {
  const { user }              = useAuth();
  const [address, setAddress] = useState(user?.address||"");
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const hasPlan = user?.plan_end&&new Date(user.plan_end)>=new Date();
  const total   = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const count   = cart.reduce((s,i)=>s+i.qty,0);

  const placeOrder = async () => {
    if(!address.trim()) return;
    setLoading(true);
    try {
      const r=await api("placeOrder",{
        mobile:user.mobile, customer_name:user.name,
        items:cart, total, address, note,
        plan_order:hasPlan,
        payment_status:hasPlan?"plan":"cod",
        provider_id:user.provider_id,
      });
      if(r.success){setCart([]);onOrderPlaced(r.order_id);}
      else alert(r.message||"Failed to place order");
    } catch {
      setCart([]); onOrderPlaced("ORD"+Date.now().toString().slice(-5));
    }
    setLoading(false);
  };

  if(cart.length===0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 24px",textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:12}}>🛒</div>
      <h3 style={{fontSize:20,fontWeight:800,color:"#333",margin:"0 0 8px"}}>Your cart is empty</h3>
      <p style={{fontSize:13,color:"#888"}}>Go to Menu and add some items!</p>
    </div>
  );

  return (
    <div style={{paddingBottom:16}}>
      <div style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)",padding:"16px"}}>
        <h2 style={{color:"#fff",fontSize:18,fontWeight:800,margin:0}}>Your Order ({count} items)</h2>
      </div>
      <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={cardSt}>
          <p style={secLbl}>🛍 Items</p>
          {cart.map((item,i)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,paddingBottom:i<cart.length-1?10:0,marginBottom:i<cart.length-1?10:0,borderBottom:i<cart.length-1?"1px solid #f0f0f0":"none"}}>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:600,color:"#333",margin:"0 0 2px"}}>{item.name}</p>
                <p style={{fontSize:11,color:"#bbb",margin:0}}>₹{item.price} × {item.qty}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setCart(p=>p.map(c=>c.id===item.id?{...c,qty:Math.max(1,c.qty-1)}:c))} style={{width:24,height:24,borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:14,color:"#666"}}>−</button>
                <span style={{fontSize:14,fontWeight:700,minWidth:16,textAlign:"center"}}>{item.qty}</span>
                <button onClick={()=>setCart(p=>p.map(c=>c.id===item.id?{...c,qty:c.qty+1}:c))} style={{width:24,height:24,borderRadius:6,border:"1.5px solid #e74c3c",background:"#fff",cursor:"pointer",fontSize:14,color:"#e74c3c"}}>+</button>
              </div>
              <span style={{fontSize:13,fontWeight:700,minWidth:42,textAlign:"right"}}>₹{item.price*item.qty}</span>
              <button onClick={()=>setCart(p=>p.filter(c=>c.id!==item.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:16,padding:"0 2px"}}>✕</button>
            </div>
          ))}
        </div>
        <div style={cardSt}>
          <p style={secLbl}>📍 Delivery Address</p>
          <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2}
            placeholder="Enter your full delivery address *"
            style={{...inputSt,resize:"none",marginBottom:0}}/>
        </div>
        <div style={cardSt}>
          <p style={secLbl}>📝 Special Instructions (optional)</p>
          <input value={note} onChange={e=>setNote(e.target.value)}
            placeholder="E.g. less spicy, extra roti…"
            style={{...inputSt,marginBottom:0}}/>
        </div>
        <div style={cardSt}>
          <p style={secLbl}>🧾 Bill Summary</p>
          {cart.map(i=>(
            <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#666",marginBottom:4}}>
              <span>{i.name} × {i.qty}</span><span>₹{i.price*i.qty}</span>
            </div>
          ))}
          <div style={{borderTop:"1px dashed #e0e0e0",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:15,color:"#1a1a1a"}}>
            <span>Total</span><span>₹{total}</span>
          </div>
        </div>
        {hasPlan
          ?<div style={{background:"#e8f4fd",border:"1.5px solid #90caf9",borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>📅</span>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:"#1565c0",margin:"0 0 2px"}}>Covered by your Plan</p>
              <p style={{fontSize:11,color:"#1976d2",margin:0}}>No payment needed · plan expires {new Date(user.plan_end).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          :<div style={{background:"#e8f5e9",border:"1.5px solid #a5d6a7",borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>💵</span>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:"#2e7d32",margin:"0 0 2px"}}>Cash on Delivery</p>
              <p style={{fontSize:11,color:"#388e3c",margin:0}}>Pay ₹{total} in cash when your tiffin arrives</p>
            </div>
          </div>
        }
        <button onClick={placeOrder} disabled={loading||!address.trim()}
          style={{width:"100%",padding:"15px 0",borderRadius:16,border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:15,fontWeight:800,color:"#fff",
            background:loading||!address.trim()?"#bbb":"linear-gradient(90deg,#c0392b,#e74c3c)",
            boxShadow:"0 6px 20px rgba(192,57,43,0.4)"}}>
          {loading?"Placing Order…":hasPlan?"📦 Place Order (Plan)":"📦 Place Order (Pay on Delivery)"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER — MY ORDERS
═══════════════════════════════════════════════════════════════ */
function OrdersPage() {
  const { user }              = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api("getOrders",{mobile:user.mobile})
      .then(r=>setOrders(r.orders||[]))
      .catch(()=>setOrders([
        {order_id:"ORD002",items:'[{"name":"Paneer Butter Masala + Roti","qty":1,"price":110}]',total:110,status:"confirmed",  payment_status:"plan",created_at:"Today, 11:50 AM"},
        {order_id:"ORD001",items:'[{"name":"Dal Tadka + Rice","qty":2,"price":80}]',           total:160,status:"delivered",  payment_status:"cod", created_at:"Yesterday, 12:05 PM"},
      ]))
      .finally(()=>setLoading(false));
  },[]);

  if(loading) return <Loader/>;
  return (
    <div style={{paddingBottom:16}}>
      <div style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)",padding:"16px 16px 20px"}}>
        <h2 style={{color:"#fff",fontSize:20,fontWeight:800,margin:0}}>My Orders</h2>
      </div>
      {orders.length===0
        ?<div style={{textAlign:"center",padding:"60px 24px"}}><div style={{fontSize:56}}>📋</div><h3 style={{fontSize:18,fontWeight:800,color:"#333",margin:"12px 0 6px"}}>No orders yet</h3></div>
        :<div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          {[...orders].reverse().map(o=>{
            const items=typeof o.items==="string"?JSON.parse(o.items):o.items;
            return (
              <div key={o.order_id} style={cardSt}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <p style={{fontSize:13,fontWeight:800,color:"#333",margin:"0 0 2px"}}>{o.order_id}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>{o.created_at}</p>
                  </div>
                  <StatusBadge status={o.status}/>
                </div>
                <div style={{borderTop:"1px solid #f5f5f5",paddingTop:8}}>
                  {items?.map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#555",marginBottom:3}}>
                      <span>{item.name} × {item.qty}</span><span>₹{item.price*item.qty}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:14,color:"#1a1a1a",borderTop:"1px dashed #eee",marginTop:6,paddingTop:6}}>
                    <span>Total</span><span>₹{o.total}</span>
                  </div>
                  <span style={{display:"inline-block",marginTop:8,fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600,
                    background:o.payment_status==="plan"?"#e8f0fe":"#e8f5e9",
                    color:o.payment_status==="plan"?"#1a73e8":"#2e7d32"}}>
                    {o.payment_status==="plan"?"📅 Plan":"💵 Cash on Delivery"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER — PLANS
═══════════════════════════════════════════════════════════════ */
function PlansPage() {
  const { user, setUser } = useAuth();
  const [busy, setBusy]   = useState(null);
  const hasPlan = user?.plan_end&&new Date(user.plan_end)>=new Date();
  const plans = [
    {id:"weekly", name:"Weekly Plan", duration:7, price:399, perMeal:57,meals:7, icon:"📅",desc:"Perfect for trying us out"},
    {id:"monthly",name:"Monthly Plan",duration:30,price:1299,perMeal:43,meals:30,icon:"🗓️",desc:"Best value — most popular!",popular:true},
  ];
  const subscribe = async (plan) => {
    setBusy(plan.id);
    const end=new Date(); end.setDate(end.getDate()+plan.duration);
    try { await api("activatePlan",{mobile:user.mobile,plan_id:plan.id,end_date:end.toISOString(),amount:plan.price,payment_id:"CASH_"+Date.now()}); } catch {}
    const u={...user,plan_type:plan.id,plan_end:end.toISOString()};
    localStorage.setItem("tb_user",JSON.stringify(u)); setUser(u);
    alert(`✅ Plan activated!\n${plan.name} valid until ${end.toLocaleDateString("en-IN")}\n\n(Collect ₹${plan.price} in cash from customer)`);
    setBusy(null);
  };
  return (
    <div style={{paddingBottom:16}}>
      <div style={{background:"linear-gradient(135deg,#c0392b,#f39c12)",padding:"20px 16px 24px"}}>
        <h2 style={{color:"#fff",fontSize:20,fontWeight:800,margin:0}}>Subscription Plans</h2>
        <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,margin:"4px 0 0"}}>Pay once. Order unlimited!</p>
      </div>
      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:14}}>
        {hasPlan&&<div style={{background:"#e8f5e9",border:"1.5px solid #a5d6a7",borderRadius:16,padding:"14px"}}>
          <p style={{fontSize:14,fontWeight:800,color:"#2e7d32",margin:"0 0 4px"}}>✅ Plan Active</p>
          <p style={{fontSize:12,color:"#388e3c",margin:0}}>{user.plan_type==="weekly"?"Weekly":"Monthly"} · Valid till {new Date(user.plan_end).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</p>
        </div>}
        {plans.map(plan=>(
          <div key={plan.id} style={{background:"#fff",borderRadius:18,overflow:"hidden",border:plan.popular?"2px solid #e74c3c":"1.5px solid #f0f0f0",boxShadow:"0 3px 14px rgba(0,0,0,0.08)"}}>
            {plan.popular&&<div style={{background:"linear-gradient(90deg,#c0392b,#e74c3c)",color:"#fff",textAlign:"center",fontSize:11,fontWeight:700,padding:"6px",letterSpacing:1}}>🔥 MOST POPULAR</div>}
            <div style={{padding:"16px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <span style={{fontSize:32}}>{plan.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:16,fontWeight:800,color:"#1a1a1a",margin:"0 0 3px"}}>{plan.name}</p>
                  <p style={{fontSize:12,color:"#888",margin:0}}>{plan.desc}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:22,fontWeight:900,color:"#1a1a1a",margin:"0 0 2px"}}>₹{plan.price}</p>
                  <p style={{fontSize:11,color:"#aaa",margin:0}}>/{plan.duration} days</p>
                </div>
              </div>
              <div style={{display:"flex",gap:8,margin:"12px 0"}}>
                <span style={{background:"#e8f5e9",color:"#2e7d32",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:10}}>~₹{plan.perMeal}/meal</span>
                <span style={{background:"#fff3e0",color:"#e65100",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:10}}>{plan.meals} orders</span>
              </div>
              <button onClick={()=>subscribe(plan)} disabled={busy===plan.id}
                style={{width:"100%",padding:"11px 0",borderRadius:12,border:plan.popular?"none":"2px solid #e74c3c",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,
                  background:plan.popular?"linear-gradient(90deg,#c0392b,#e74c3c)":"transparent",
                  color:plan.popular?"#fff":"#e74c3c",
                  boxShadow:plan.popular?"0 4px 14px rgba(192,57,43,0.35)":"none"}}>
                {busy===plan.id?"Activating…":`Subscribe ₹${plan.price} (Cash)`}
              </button>
            </div>
          </div>
        ))}
        <div style={{background:"#f0f4ff",border:"1px solid #c7d2fe",borderRadius:14,padding:"13px"}}>
          <p style={{fontSize:12,fontWeight:700,color:"#3730a3",margin:"0 0 4px"}}>💳 Online payments coming soon</p>
          <p style={{fontSize:11,color:"#4338ca",margin:0,lineHeight:1.5}}>PhonePe/UPI will be enabled after onboarding. Currently plans can be activated by the provider manually upon cash collection.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER — PROFILE
═══════════════════════════════════════════════════════════════ */
function ProfilePage({ onLogout }) {
  const { user }  = useAuth();
  const hasPlan   = user?.plan_end&&new Date(user.plan_end)>=new Date();
  return (
    <div style={{paddingBottom:16}}>
      <div style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)",padding:"24px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>👤</div>
          <div>
            <h2 style={{color:"#fff",fontSize:20,fontWeight:800,margin:"0 0 2px"}}>{user?.name}</h2>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:12,margin:0}}>📱 {user?.mobile}</p>
          </div>
        </div>
      </div>
      <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
        {hasPlan&&<div style={{...cardSt,border:"1.5px solid #a5d6a7",background:"#e8f5e9"}}>
          <p style={{fontSize:14,fontWeight:800,color:"#2e7d32",margin:"0 0 3px"}}>✅ Active Plan</p>
          <p style={{fontSize:12,color:"#388e3c",margin:0}}>{user.plan_type==="weekly"?"Weekly":"Monthly"} · expires {new Date(user.plan_end).toLocaleDateString("en-IN")}</p>
        </div>}
        <div style={cardSt}>
          {[{icon:"🍱",label:"Your Provider",val:user?.provider_name||user?.provider_id||"—"},{icon:"📍",label:"Delivery Address",val:user?.address||"Not set"},{icon:"📱",label:"Mobile",val:user?.mobile}].map((row,i,arr)=>(
            <div key={row.label} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?"1px solid #f5f5f5":"none"}}>
              <span style={{fontSize:20}}>{row.icon}</span>
              <div>
                <p style={{fontSize:11,color:"#aaa",margin:"0 0 2px"}}>{row.label}</p>
                <p style={{fontSize:13,fontWeight:600,color:"#333",margin:0}}>{row.val}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onLogout} style={{width:"100%",padding:"13px 0",borderRadius:14,border:"2px solid #f9c4c4",background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,color:"#e74c3c"}}>🚪 Logout</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOMER APP SHELL
═══════════════════════════════════════════════════════════════ */
function CustomerApp({ onLogout }) {
  const [tab,   setTab]  = useState("home");
  const [cart,  setCart] = useState([]);
  const [toast, setToast]= useState(null);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);

  const handleOrderPlaced=(oid)=>{
    setToast(`🎉 Order #${oid} placed! Pay ₹ cash on delivery.`);
    setTimeout(()=>setToast(null),4000); setTab("orders");
  };
  const navTabs=[
    {id:"home",   icon:"🍛",label:"Menu"   },
    {id:"orders", icon:"📋",label:"Orders" },
    {id:"plans",  icon:"📅",label:"Plans"  },
    {id:"profile",icon:"👤",label:"Profile"},
  ];
  return (
    <div style={{minHeight:"100vh",background:"#f5f5f5",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",fontFamily:"'Poppins',sans-serif",position:"relative"}}>
      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,background:"#2e7d32",color:"#fff",padding:"10px 20px",borderRadius:20,fontSize:13,fontWeight:600,boxShadow:"0 6px 20px rgba(0,0,0,0.25)",maxWidth:"90%",textAlign:"center"}}>{toast}</div>}
      <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
        {tab==="home"    &&<MenuPage    cart={cart} setCart={setCart}/>}
        {tab==="cart"    &&<CartPage    cart={cart} setCart={setCart} onOrderPlaced={handleOrderPlaced}/>}
        {tab==="orders"  &&<OrdersPage/>}
        {tab==="plans"   &&<PlansPage/>}
        {tab==="profile" &&<ProfilePage onLogout={onLogout}/>}
      </div>
      {cartCount>0&&tab!=="cart"&&(
        <div style={{position:"fixed",bottom:68,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 28px)",maxWidth:402,zIndex:50}}>
          <button onClick={()=>setTab("cart")}
            style={{width:"100%",padding:"14px 18px",borderRadius:16,border:"none",cursor:"pointer",fontFamily:"inherit",background:"linear-gradient(90deg,#c0392b,#e74c3c)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 24px rgba(192,57,43,0.5)",fontSize:13,fontWeight:700}}>
            <span style={{background:"rgba(255,255,255,0.22)",borderRadius:8,padding:"3px 10px"}}>{cartCount} item{cartCount!==1?"s":""}</span>
            <span>View Cart 🛒</span>
            <span>₹{cartTotal}</span>
          </button>
        </div>
      )}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:"1px solid #f0f0f0",display:"flex",zIndex:40,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {navTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"10px 0",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:600,color:tab===t.id?"#e74c3c":"#bbb"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:20,height:2,borderRadius:2,background:"#e74c3c"}}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER — ORDERS DASHBOARD
═══════════════════════════════════════════════════════════════ */
function ProvOrders({ providerId }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  const load=async()=>{
    try{const r=await api("getProviderOrders",{provider_id:providerId});setOrders(r.orders||[]);}
    catch{setOrders(DEMO_ORDERS.filter(o=>o.provider_id===providerId||!providerId));}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const setStatus=async(oid,st)=>{
    try{await api("updateOrderStatus",{order_id:oid,status:st});}catch{}
    setOrders(p=>p.map(o=>o.order_id===oid?{...o,status:st}:o));
  };

  const ACTIONS={
    pending:          [{label:"✅ Accept",st:"confirmed",bg:"#27ae60"},{label:"❌ Cancel",st:"cancelled",bg:"#e74c3c"}],
    confirmed:        [{label:"👨‍🍳 Start Preparing",st:"preparing",bg:"#8e44ad"}],
    preparing:        [{label:"🚴 Out for Delivery",st:"out_for_delivery",bg:"#e67e22"}],
    out_for_delivery: [{label:"✅ Mark Delivered",st:"delivered",bg:"#27ae60"}],
    delivered:[],cancelled:[],
  };
  const FILTERS=["all","pending","confirmed","preparing","out_for_delivery","delivered","cancelled"];
  const shown=filter==="all"?orders:orders.filter(o=>o.status===filter);

  if(loading) return <Loader/>;
  return (
    <div>
      <div style={{padding:"10px 14px",overflowX:"auto",display:"flex",gap:8,scrollbarWidth:"none"}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,
              background:filter===f?"#c0392b":"#fff",color:filter===f?"#fff":"#666",
              boxShadow:filter===f?"none":"0 1px 4px rgba(0,0,0,0.08)"}}>
            {f==="out_for_delivery"?"On Delivery":f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      <p style={{fontSize:11,color:"#aaa",padding:"0 16px 6px"}}>{shown.length} orders</p>
      <div style={{padding:"0 14px 80px",display:"flex",flexDirection:"column",gap:10}}>
        {shown.length===0
          ?<p style={{textAlign:"center",color:"#bbb",padding:"40px 0",fontSize:13}}>No orders here</p>
          :shown.map(o=>{
            const items=typeof o.items==="string"?JSON.parse(o.items):o.items;
            const acts=ACTIONS[o.status]||[];
            return (
              <div key={o.order_id} style={{background:"#fff",borderRadius:16,padding:"14px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)",border:"1px solid #f0f0f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div>
                    <p style={{fontSize:14,fontWeight:800,color:"#1a1a1a",margin:"0 0 2px"}}>{o.customer_name}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>📱 {o.mobile} · {o.order_id}</p>
                    <p style={{fontSize:11,color:"#bbb",margin:0}}>🕐 {o.created_at}</p>
                  </div>
                  <StatusBadge status={o.status}/>
                </div>
                <div style={{borderTop:"1px solid #f5f5f5",paddingTop:8,marginTop:4}}>
                  {items?.map((item,i)=><p key={i} style={{fontSize:13,color:"#555",margin:"0 0 2px"}}>{item.name} × {item.qty}</p>)}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                    <span style={{fontSize:15,fontWeight:800,color:"#1a1a1a"}}>₹{o.total}</span>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600,
                      background:o.payment_status==="plan"?"#e8f0fe":"#e8f5e9",
                      color:o.payment_status==="plan"?"#1a73e8":"#2e7d32"}}>
                      {o.payment_status==="plan"?"📅 Plan":"💵 COD"}
                    </span>
                  </div>
                  {o.note&&<p style={{fontSize:12,color:"#888",marginTop:4,fontStyle:"italic"}}>📝 {o.note}</p>}
                  <p style={{fontSize:11,color:"#aaa",marginTop:4}}>📍 {o.address}</p>
                </div>
                {acts.length>0&&(
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    {acts.map(a=>(
                      <button key={a.st} onClick={()=>setStatus(o.order_id,a.st)}
                        style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"#fff",background:a.bg}}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER — MENU
═══════════════════════════════════════════════════════════════ */
function ProvMenu({ providerId }) {
  const [menu,    setMenu]   = useState([]);
  const [loading, setLoading]= useState(true);
  const [adding,  setAdding] = useState(false);
  const [saving,  setSaving] = useState(false);
  const [form,    setForm]   = useState({name:"",desc:"",price:"",category:"Lunch",veg:true});
  const today=new Date().toISOString().split("T")[0];

  useEffect(()=>{
    api("getMenu",{date:today,provider_id:providerId})
      .then(r=>setMenu(r.menu?.length?r.menu:DEMO_MENU))
      .catch(()=>setMenu(DEMO_MENU))
      .finally(()=>setLoading(false));
  },[]);

  const save=async()=>{
    if(!form.name.trim()||!form.price)return;
    setSaving(true);
    const item={...form,id:Date.now().toString(),price:parseInt(form.price),date:today,available:true,provider_id:providerId};
    try{await api("addMenuItem",item);}catch{}
    setMenu(p=>[...p,item]);
    setForm({name:"",desc:"",price:"",category:"Lunch",veg:true});
    setAdding(false);setSaving(false);
  };
  const toggle=async(id)=>{try{await api("toggleMenuItem",{id});}catch{} setMenu(p=>p.map(i=>i.id===id?{...i,available:!i.available}:i));};
  const del=async(id)=>{try{await api("deleteMenuItem",{id});}catch{} setMenu(p=>p.filter(i=>i.id!==id));};

  if(loading) return <Loader/>;
  return (
    <div style={{padding:"12px 14px 80px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <p style={{fontSize:12,color:"#aaa",margin:0}}>{menu.length} items · {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</p>
        <button onClick={()=>setAdding(true)} style={{background:"#c0392b",color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add Item</button>
      </div>
      {adding&&(
        <div style={{...cardSt,border:"2px solid #e74c3c",marginBottom:14}}>
          <p style={{fontSize:14,fontWeight:800,color:"#333",marginBottom:12}}>New Menu Item</p>
          <input style={inputSt} placeholder="Item Name *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
          <input style={inputSt} placeholder="Description" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
          <div style={{display:"flex",gap:8}}>
            <input style={{...inputSt,flex:1}} placeholder="Price ₹ *" type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/>
            <select style={{...inputSt,flex:1}} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
              <option>Lunch</option><option>Dinner</option><option>Breakfast</option>
            </select>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#555",marginBottom:12,cursor:"pointer"}}>
            <input type="checkbox" checked={form.veg} onChange={e=>setForm(p=>({...p,veg:e.target.checked}))} style={{width:16,height:16,accentColor:"#27ae60"}}/>
            🟢 Vegetarian item
          </label>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} disabled={saving} style={{flex:1,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,color:"#fff",background:saving?"#bbb":"#c0392b"}}>{saving?"Saving…":"Save Item"}</button>
            <button onClick={()=>setAdding(false)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"1.5px solid #ddd",background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:"#888"}}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {menu.map(item=>(
          <div key={item.id} style={{...cardSt,opacity:item.available===false||item.available==="FALSE"?0.55:1,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                <VegDot veg={item.veg}/><span style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{item.name}</span>
              </div>
              {item.desc&&<p style={{fontSize:11,color:"#aaa",margin:"0 0 4px"}}>{item.desc}</p>}
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#333"}}>₹{item.price}</span>
                <span style={{fontSize:11,background:"#f0f0f0",color:"#888",padding:"1px 7px",borderRadius:8}}>{item.category}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button onClick={()=>toggle(item.id)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,background:item.available===false||item.available==="FALSE"?"#f0f0f0":"#e8f5e9",color:item.available===false||item.available==="FALSE"?"#aaa":"#2e7d32"}}>{item.available===false||item.available==="FALSE"?"Hidden":"Visible"}</button>
              <button onClick={()=>del(item.id)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,background:"#fde8e8",color:"#c0392b"}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER — DASHBOARD
═══════════════════════════════════════════════════════════════ */
function ProvDashboard({ providerId }) {
  const [stats,setStats]=useState({pending:0,confirmed:0,delivered:0,revenue:0,plan_customers:0});
  useEffect(()=>{
    api("getDashboardStats",{provider_id:providerId})
      .then(r=>setStats(r.stats))
      .catch(()=>setStats({pending:3,confirmed:2,delivered:15,revenue:2450,plan_customers:8}));
  },[]);
  const CARDS=[
    {label:"Pending",        val:stats.pending,        icon:"⏳",bg:"#fff7e0",border:"#ffe082",vc:"#b7791f"},
    {label:"Confirmed",      val:stats.confirmed,      icon:"✅",bg:"#e8f4fd",border:"#90caf9",vc:"#1565c0"},
    {label:"Delivered Today",val:stats.delivered,      icon:"🚴",bg:"#e8f5e9",border:"#a5d6a7",vc:"#2e7d32"},
    {label:"Revenue Today",  val:`₹${stats.revenue}`,  icon:"💰",bg:"#f3e8ff",border:"#ce93d8",vc:"#6a1b9a"},
    {label:"Plan Customers", val:stats.plan_customers, icon:"📅",bg:"#fff3e0",border:"#ffcc80",vc:"#e65100"},
  ];
  return (
    <div style={{padding:"14px"}}>
      <p style={{fontSize:11,color:"#aaa",marginBottom:14}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {CARDS.map(c=>(
          <div key={c.label} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:16,padding:"14px"}}>
            <div style={{fontSize:24,marginBottom:4}}>{c.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:c.vc}}>{c.val}</div>
            <div style={{fontSize:11,color:"#777",marginTop:2}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff8e1",border:"1px solid #ffe082",borderRadius:14,padding:"14px"}}>
        <p style={{fontSize:13,fontWeight:700,color:"#e65100",margin:"0 0 8px"}}>💡 How to use</p>
        {["Menu tab → Add / toggle today's food items","Orders tab → Accept → Prepare → Out for Delivery → Delivered","COD: collect cash when delivering","Plan customers: collect monthly cash, then activate plan in app"].map(t=>(
          <p key={t} style={{fontSize:12,color:"#bf360c",margin:"0 0 4px"}}>• {t}</p>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER APP SHELL
═══════════════════════════════════════════════════════════════ */
function ProviderApp({ onLogout }) {
  const { user }  = useAuth();
  const [tab,setTab]=useState("dashboard");
  const navTabs=[
    {id:"dashboard",icon:"📊",label:"Overview"},
    {id:"orders",   icon:"📋",label:"Orders"  },
    {id:"menu",     icon:"🍛",label:"Menu"    },
  ];
  return (
    <div style={{minHeight:"100vh",background:"#f0f0f0",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",fontFamily:"'Poppins',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#1a1a2e,#2d2d44)",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{color:"#fff",fontSize:16,fontWeight:800,margin:0}}>🍱 {user?.name||"Provider Dashboard"}</h1>
          <p style={{color:"rgba(255,255,255,0.45)",fontSize:11,margin:"2px 0 0"}}>ID: {user?.provider_id} · Provider Mode</p>
        </div>
        <button onClick={onLogout} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"rgba(255,255,255,0.7)",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Logout</button>
      </div>
      <div style={{background:"#fff",padding:"10px 16px",borderBottom:"1px solid #f0f0f0"}}>
        <h2 style={{fontSize:15,fontWeight:800,color:"#1a1a1a",margin:0}}>
          {tab==="dashboard"?"Overview":tab==="orders"?"All Orders":"Today's Menu"}
        </h2>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
        {tab==="dashboard"&&<ProvDashboard providerId={user?.provider_id}/>}
        {tab==="orders"   &&<ProvOrders   providerId={user?.provider_id}/>}
        {tab==="menu"     &&<ProvMenu     providerId={user?.provider_id}/>}
      </div>
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:"1px solid #e0e0e0",display:"flex",zIndex:40,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {navTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"10px 0",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:600,color:tab===t.id?"#1a1a2e":"#bbb"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:20,height:2,borderRadius:2,background:"#c0392b"}}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [user,setUser]=useState(()=>{try{const s=localStorage.getItem("tb_user");return s?JSON.parse(s):null;}catch{return null;}});
  const login =u=>{setUser(u);};
  const logout =()=>{localStorage.removeItem("tb_user");setUser(null);};
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap"/>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#f0f0f0}::-webkit-scrollbar{display:none}.spin-ring{width:36px;height:36px;border:4px solid #f3e8e8;border-top:4px solid #e74c3c;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <AuthCtx.Provider value={{user,setUser}}>
        {!user
          ?<LoginPage onLogin={login}/>
          :user.isProvider
          ?<ProviderApp onLogout={logout}/>
          :<CustomerApp onLogout={logout}/>
        }
      </AuthCtx.Provider>
    </>
  );
}
