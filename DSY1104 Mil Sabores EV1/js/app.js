
const STORAGE = {
  products: "mil_sabores_products",
  cart: "mil_sabores_cart",
  users: "mil_sabores_users",
  currentUser: "mil_sabores_current_user"
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0
});

function getProducts() {
  const saved = localStorage.getItem(STORAGE.products);
  if (!saved) {
    localStorage.setItem(STORAGE.products, JSON.stringify(PRODUCTS));
    return [...PRODUCTS];
  }
  try { return JSON.parse(saved); } catch { return [...PRODUCTS]; }
}
function saveProducts(items){ localStorage.setItem(STORAGE.products, JSON.stringify(items)); }
function getCart(){
  try { return JSON.parse(localStorage.getItem(STORAGE.cart)) || []; }
  catch { return []; }
}
function saveCart(cart){ localStorage.setItem(STORAGE.cart, JSON.stringify(cart)); updateCartBadge(); }
function getUsers(){
  try { return JSON.parse(localStorage.getItem(STORAGE.users)) || []; }
  catch { return []; }
}
function saveUsers(users){ localStorage.setItem(STORAGE.users, JSON.stringify(users)); }
function getCurrentUser(){
  try { return JSON.parse(localStorage.getItem(STORAGE.currentUser)); }
  catch { return null; }
}
function setCurrentUser(user){ localStorage.setItem(STORAGE.currentUser, JSON.stringify(user)); updateAuthUI(); }

function formatPrice(value){ return currency.format(Number(value) || 0); }

function productImage(product){
  const expected=`assets/img/${product.code.toLowerCase()}.svg`;
  const knownCodes=PRODUCTS.map(p=>p.code.toLowerCase());
  return knownCodes.includes(String(product.code).toLowerCase()) ? expected : "assets/img/tt001.svg";
}
function productImageFromCode(code){
  const found = getProducts().find(p => p.code === code);
  return found ? productImage(found) : "";
}

function showToast(message){
  let toast = document.querySelector("#toast");
  if(!toast){
    toast = document.createElement("div");
    toast.id="toast"; toast.className="toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function updateCartBadge(){
  const count = getCart().reduce((sum,item)=>sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach(el=>el.textContent=count);
}

function updateAuthUI(){
  const user = getCurrentUser();
  document.querySelectorAll("[data-auth-label]").forEach(el=>{
    el.textContent = user ? `Hola, ${user.name.split(" ")[0]}` : "Ingresar";
  });
}

function discountRate(user){
  if(!user) return 0;
  const age = Number(user.age) || 0;
  return age > 50 ? .50 : user.lifetimeDiscount ? .10 : 0;
}
function finalUnitPrice(product,user){
  const rate = discountRate(user);
  return Math.round(Number(product.price) * (1-rate));
}
function isBirthdayToday(user){
  if(!user || !user.dob) return false;
  const birth=new Date(user.dob+"T00:00:00"), today=new Date();
  return birth.getMonth()===today.getMonth() && birth.getDate()===today.getDate();
}
function itemUnitPrice(item,product,user){
  return item.gift ? 0 : finalUnitPrice(product,user);
}

function addToCart(code, quantity=1, note=""){
  const product = getProducts().find(p=>p.code===code);
  if(!product) return;
  const cart=getCart();
  const existing=cart.find(i=>i.code===code && i.note===note && !i.gift);
  if(existing) existing.quantity += quantity;
  else cart.push({code,quantity,note,gift:false});
  saveCart(cart);
  showToast(`${product.name} fue agregado al carrito.`);
}

function removeFromCart(index){
  const cart=getCart();
  cart.splice(index,1);
  saveCart(cart);
  renderCart();
}
function changeCartQuantity(index, delta){
  const cart=getCart();
  cart[index].quantity = Math.max(1, cart[index].quantity + delta);
  saveCart(cart); renderCart();
}

function renderProductCard(product){
  return `
  <article class="product-card">
    <a class="product-img" href="detalle.html?codigo=${encodeURIComponent(product.code)}" aria-label="Ver ${product.name}">
      <img src="${productImage(product)}" alt="${product.name}">
    </a>
    <div class="product-body">
      <span class="tag">${product.tag}</span>
      <h3>${product.name}</h3>
      <p>${product.short}</p>
      <div class="price-row">
        <span class="price">${formatPrice(product.price)}</span>
        <button class="mini-btn" type="button" data-add="${product.code}">Agregar</button>
      </div>
    </div>
  </article>`;
}

function wireAddButtons(){
  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click",()=>addToCart(btn.dataset.add));
  });
}

function renderFeatured(){
  const target=document.querySelector("#featured-products");
  if(!target) return;
  const products=getProducts().slice(0,4);
  target.innerHTML=products.map(renderProductCard).join("");
  wireAddButtons();
}

function renderProductCatalog(){
  const target=document.querySelector("#product-catalog");
  if(!target) return;
  const search=(document.querySelector("#product-search")?.value || "").trim().toLowerCase();
  const category=document.querySelector("#product-category")?.value || "Todas";
  const shape=document.querySelector("#product-shape")?.value || "Todos";
  const products=getProducts().filter(p=>{
    const matchesSearch=!search || `${p.name} ${p.short} ${p.category}`.toLowerCase().includes(search);
    const matchesCategory=category==="Todas" || p.category===category;
    const shapes=["Tortas Cuadradas","Tortas Circulares"];
    const matchesShape=shape==="Todos" || (shape==="Cuadradas" ? p.category===shapes[0] : p.category===shapes[1]);
    return matchesSearch && matchesCategory && matchesShape;
  });
  target.innerHTML = products.length ? products.map(renderProductCard).join("") :
    `<div class="empty" style="grid-column:1/-1">No encontramos productos con esas características. Prueba con otro filtro.</div>`;
  wireAddButtons();
}

function setupCatalogFilters(){
  ["#product-search","#product-category","#product-shape"].forEach(sel=>{
    document.querySelector(sel)?.addEventListener("input",renderProductCatalog);
  });
  renderProductCatalog();
}

function renderProductDetail(){
  const mount=document.querySelector("#product-detail");
  if(!mount) return;
  const params=new URLSearchParams(location.search);
  const code=params.get("codigo") || "TC001";
  const product=getProducts().find(p=>p.code===code) || getProducts()[0];
  document.title=`${product.name} | Mil Sabores`;
  mount.innerHTML=`
    <div class="detail-grid">
      <div class="detail-image"><img src="${productImage(product)}" alt="${product.name}"></div>
      <div class="detail-content">
        <span class="tag">${product.category}</span>
        <h1>${product.name}</h1>
        <p class="kicker">${product.tag}</p>
        <p>${product.short}</p>
        <p class="price">${formatPrice(product.price)}</p>
        <ul>
          <li>Preparación artesanal en lotes pequeños.</li>
          <li>Receta inspirada en la cocina familiar árabe-chilena.</li>
          <li>Puede incluir mensaje especial en tortas.</li>
        </ul>
        ${product.category.includes("Tortas") ? `<div class="personalize">
          <strong>Elige el tamaño</strong>
          <p class="form-help">El precio base corresponde al tamaño mediano.</p>
          <select class="form-control" id="detail-size">
            <option value="Mediana - 12 porciones">Mediana - 12 porciones</option>
            <option value="Familiar - 20 porciones">Familiar - 20 porciones</option>
            <option value="Celebración - 30 porciones">Celebración - 30 porciones</option>
          </select>
        </div>` : ""}
        <div class="personalize">
          <strong>Un mensaje para quien quieres</strong>
          <p class="form-help">En tortas, escribe una dedicatoria de hasta 60 caracteres.</p>
          <input class="form-control" id="detail-note" maxlength="60" placeholder="Ej.: Con cariño, abuelita">
        </div>
        <div class="qty-row">
          <div class="qty-control"><button id="detail-minus" type="button">-</button><span id="detail-qty">1</span><button id="detail-plus" type="button">+</button></div>
          <button class="btn btn-primary" id="detail-add" type="button">Agregar al carrito</button>
        </div>
      </div>
    </div>`;
  let qty=1;
  const qtyLabel=mount.querySelector("#detail-qty");
  mount.querySelector("#detail-minus").onclick=()=>{qty=Math.max(1,qty-1);qtyLabel.textContent=qty};
  mount.querySelector("#detail-plus").onclick=()=>{qty++;qtyLabel.textContent=qty};
  mount.querySelector("#detail-add").onclick=()=>{
    const note=mount.querySelector("#detail-note").value.trim();
    const size=mount.querySelector("#detail-size")?.value || "";
    if(note.length>60){ showToast("El mensaje no puede superar 60 caracteres."); return; }
    const cartNote=[size, note].filter(Boolean).join(" · ");
    addToCart(code,qty,cartNote);
  };
}

function renderCart(){
  const mount=document.querySelector("#cart-content");
  if(!mount) return;
  const cart=getCart();
  const user=getCurrentUser();
  if(!cart.length){
    mount.innerHTML=`<div class="empty"><div style="font-size:3rem">🧺</div><h2>La mesita está esperando</h2><p>Agrega algunos dulces para llenar tu carrito.</p><a class="btn btn-primary" href="productos.html">Ver repostería</a></div>`;
    const summary=document.querySelector("#cart-summary"); if(summary) summary.innerHTML="";
    return;
  }
  let subtotal=0;
  const rows=cart.map((item,index)=>{
    const product=getProducts().find(p=>p.code===item.code);
    const unit=itemUnitPrice(item,product,user);
    subtotal += unit*item.quantity;
    return `<div class="cart-item">
      <div class="cart-thumb"><img src="${productImage(product)}" alt="${product.name}"></div>
      <div>
        <h4>${product.name}</h4>
        <div class="cart-meta">${item.note ? `Dedicatoria: ${item.note}` : "Sin dedicatoria"} · ${formatPrice(unit)} c/u</div>
        <div class="item-actions" style="margin-top:8px">
          <div class="qty-control"><button type="button" data-dec="${index}">-</button><span>${item.quantity}</span><button type="button" data-inc="${index}">+</button></div>
          <button class="remove-btn" type="button" data-remove="${index}">Quitar</button>
        </div>
      </div>
      <strong>${formatPrice(unit*item.quantity)}</strong>
    </div>`;
  }).join("");
  const discount = cart.reduce((sum,item)=>{
    const p=getProducts().find(x=>x.code===item.code);
    return sum + (item.gift ? Number(p.price) : (Number(p.price)-finalUnitPrice(p,user)))*item.quantity;
  },0);
  const total=subtotal;
  mount.innerHTML=rows;
  const summary=document.querySelector("#cart-summary");
  const birthdayEligible=user && user.duocStudent && isBirthdayToday(user);
  const birthdayCallout=birthdayEligible ? `<div class="success" style="display:block"><strong>🎂 Regalo de cumpleaños Duoc</strong><br>Tu correo institucional habilita una torta de cumpleaños de cortesía.</div>` : "";
  summary.innerHTML=`
    <h2>Resumen de la compra</h2>
    ${birthdayCallout}
    ${birthdayEligible && !cart.some(i=>i.gift) ? `<button class="btn btn-soft" id="birthday-gift-btn" style="width:100%;margin-bottom:10px" type="button">Añadir torta de cumpleaños gratis</button>` : ""}
    ${user && discount > 0 ? `<div class="summary-line"><span>Descuento de ${Math.round(discountRate(user)*100)}%</span><strong>-${formatPrice(discount)}</strong></div>` : ""}
    <div class="summary-line"><span>Despacho</span><strong>Se calcula al confirmar</strong></div>
    <div class="summary-line summary-total"><span>Total</span><strong>${formatPrice(total)}</strong></div>
    <button class="btn btn-primary" id="checkout-btn" style="width:100%;margin-top:10px" type="button">Confirmar pedido</button>`;
  mount.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>removeFromCart(Number(b.dataset.remove)));
  mount.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeCartQuantity(Number(b.dataset.dec),-1));
  mount.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeCartQuantity(Number(b.dataset.inc),1));
  document.querySelector("#birthday-gift-btn")?.addEventListener("click",()=>{
    const giftProduct=getProducts().find(p=>p.code==="TE001") || getProducts()[0];
    const updated=getCart();
    updated.push({code:giftProduct.code,quantity:1,note:"Feliz cumpleaños",gift:true});
    saveCart(updated); renderCart(); showToast("La torta de cumpleaños quedó en tu canasta.");
  });
  document.querySelector("#checkout-btn").onclick=()=>{
    showToast("Pedido de demostración confirmado. Gracias por tu compra.");
  };
}

function validateEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function calculateAge(dob){
  const birth=new Date(dob+"T00:00:00");
  if(Number.isNaN(birth.getTime())) return 0;
  const today=new Date();
  let age=today.getFullYear()-birth.getFullYear();
  const m=today.getMonth()-birth.getMonth();
  if(m<0 || (m===0 && today.getDate()<birth.getDate())) age--;
  return age;
}
function clearFieldErrors(form){
  form.querySelectorAll(".error").forEach(e=>{e.style.display="none";e.textContent=""});
}
function fieldError(form, id, message){
  const el=form.querySelector(`[data-error="${id}"]`);
  if(el){el.textContent=message;el.style.display="block";}
}

function setupRegister(){
  const form=document.querySelector("#register-form");
  if(!form) return;
  form.addEventListener("submit",(event)=>{
    event.preventDefault(); clearFieldErrors(form);
    const name=form.name.value.trim(), email=form.email.value.trim().toLowerCase();
    const password=form.password.value, confirm=form.confirm.value;
    const dob=form.dob.value, code=form.coupon.value.trim().toUpperCase();
    let valid=true;
    if(!form.terms.checked){showToast("Acepta la demostración del proyecto para continuar.");valid=false}
    if(name.length<3){fieldError(form,"name","Escribe tu nombre completo.");valid=false}
    if(!validateEmail(email)){fieldError(form,"email","Ingresa un correo válido.");valid=false}
    const age=calculateAge(dob);
    if(!dob || age<13 || age>110){fieldError(form,"dob","Debes ingresar una fecha de nacimiento válida.");valid=false}
    if(password.length<8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)){fieldError(form,"password","Usa 8+ caracteres, una mayúscula y un número.");valid=false}
    if(confirm!==password){fieldError(form,"confirm","Las contraseñas no coinciden.");valid=false}
    const users=getUsers();
    if(users.some(u=>u.email===email)){fieldError(form,"email","Ese correo ya está registrado.");valid=false}
    if(!valid) return;
    const user={
      name,email,dob,age,password,
      lifetimeDiscount: code==="FELICES50",
      duocStudent: /@(duocuc\.cl|duoc\.cl)$/i.test(email)
    };
    users.push(user); saveUsers(users); setCurrentUser(user);
    form.reset();
    const success=form.querySelector(".success"); success.textContent=`¡Bienvenido/a, ${name.split(" ")[0]}! Tu cuenta quedó registrada.`; success.style.display="block";
  });
}

function setupLogin(){
  const form=document.querySelector("#login-form"); if(!form) return;
  form.addEventListener("submit",e=>{
    e.preventDefault(); clearFieldErrors(form);
    const email=form.email.value.trim().toLowerCase(), password=form.password.value;
    const user=getUsers().find(u=>u.email===email && u.password===password);
    if(!user){fieldError(form,"email","Correo o contraseña incorrectos.");return}
    setCurrentUser(user); form.reset();
    form.querySelector(".success").textContent=`Qué alegría verte de nuevo, ${user.name.split(" ")[0]}.`; form.querySelector(".success").style.display="block";
  });
}

function setupContact(){
  const form=document.querySelector("#contact-form"); if(!form) return;
  form.addEventListener("submit",e=>{
    e.preventDefault(); clearFieldErrors(form);
    const name=form.name.value.trim(), email=form.email.value.trim(), message=form.message.value.trim();
    let ok=true;
    if(name.length<3){fieldError(form,"name","Escríbenos tu nombre.");ok=false}
    if(!validateEmail(email)){fieldError(form,"email","Ingresa un correo válido.");ok=false}
    if(message.length<15){fieldError(form,"message","Cuéntanos un poco más (mínimo 15 caracteres).");ok=false}
    if(!ok)return;
    form.reset(); form.querySelector(".success").textContent="Mensaje recibido."; form.querySelector(".success").style.display="block";
  });
}

function renderAdminProducts(){
  const body=document.querySelector("#admin-products-body"); if(!body) return;
  const products=getProducts();
  body.innerHTML=products.map((p,i)=>`<tr>
    <td>${p.code}</td><td>${p.name}</td><td>${p.category}</td><td>${formatPrice(p.price)}</td>
    <td><button class="mini-btn" type="button" data-edit-product="${i}">Editar</button></td>
  </tr>`).join("");
  body.querySelectorAll("[data-edit-product]").forEach(btn=>btn.onclick=()=>{
    const p=products[Number(btn.dataset.editProduct)];
    document.querySelector("#admin-code").value=p.code;
    document.querySelector("#admin-name").value=p.name;
    document.querySelector("#admin-category").value=p.category;
    document.querySelector("#admin-price").value=p.price;
    document.querySelector("#admin-description").value=p.short;
    document.querySelector("#admin-edit-index").value=btn.dataset.editProduct;
    window.scrollTo({top:0,behavior:"smooth"});
  });
}
function setupAdminProducts(){
  const form=document.querySelector("#admin-product-form"); if(!form) return;
  document.querySelector("#admin-category").innerHTML=getProducts().map(p=>p.category).filter((v,i,a)=>a.indexOf(v)===i).map(c=>`<option>${c}</option>`).join("");
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const products=getProducts(), index=Number(form.elements.index.value);
    if(!form.elements.name.value.trim() || Number(form.elements.price.value)<=0){showToast("Completa nombre y precio.");return}
    const updated={code:form.elements.code.value.trim(),name:form.elements.name.value.trim(),category:form.elements.category.value,price:Number(form.elements.price.value),short:form.elements.description.value.trim(),shape:"round",tag:"Artesanal"};
    if(Number.isInteger(index) && index>=0) products[index]={...products[index],...updated};
    else {updated.code="MS"+String(Date.now()).slice(-5); products.push(updated);}
    saveProducts(products); form.reset(); form.elements.index.value="-1"; renderAdminProducts(); showToast("Producto guardado en el catálogo.");
  });
  renderAdminProducts();
}
function setupAdminUsers(){
  const body=document.querySelector("#admin-users-body"); if(!body) return;
  const users=getUsers();
  body.innerHTML=users.length ? users.map(u=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${u.age}</td><td>${u.lifetimeDiscount?"10% de por vida":"-"}</td><td>${u.duocStudent?"Sí":"No"}</td><td><span class="status">Activo</span></td></tr>`).join("") :
    `<tr><td colspan="6">Aún no hay usuarios registrados en este navegador.</td></tr>`;
}

function init(){
  updateCartBadge(); updateAuthUI();
  renderFeatured(); setupCatalogFilters(); renderProductDetail(); renderCart();
  setupRegister(); setupLogin(); setupContact(); setupAdminProducts(); setupAdminUsers();
}
document.addEventListener("DOMContentLoaded",init);
