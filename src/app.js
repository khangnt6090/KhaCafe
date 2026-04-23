// Simple cart and checkout logic using localStorage
(function() {
    const CART_KEY = 'kha_cart_v1';

    function parsePrice(text) {
        if (!text) return 0;
        const num = text.replace(/[^0-9]/g, '');
        return parseInt(num || '0', 10);
    }

    function formatPrice(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
    }

    function loadCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount();
    }

    function updateCartCount() {
        const cart = loadCart();
        const totalQty = cart.reduce((s,i)=>s+(i.qty||0),0);
        const el = document.querySelector('.cart-icon');
        if (el) el.innerText = `🛒 Giỏ hàng (${totalQty})`;
    }

    function addToCart(item) {
        const cart = loadCart();
        const idx = cart.findIndex(c => c.name === item.name);
        if (idx >= 0) cart[idx].qty += 1; else cart.push(Object.assign({qty:1}, item));
        saveCart(cart);
        updateCartUI();
    }

    function removeFromCart(index) {
        const cart = loadCart(); cart.splice(index,1); saveCart(cart); updateCartUI();
    }

    function changeQty(index, qty) {
        const cart = loadCart(); if (!cart[index]) return; cart[index].qty = Math.max(0, qty);
        if (cart[index].qty === 0) cart.splice(index,1); saveCart(cart); updateCartUI();
    }

    function updateCartUI() {
        const cart = loadCart();
        const container = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        if (!container) return;
        container.innerHTML = '';
        let total = 0;
        if (cart.length === 0) {
            container.innerHTML = '<p>Giỏ hàng trống.</p>';
        } else {
            cart.forEach((it, i) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                const subtotal = it.qty * it.price;
                total += subtotal;
                itemEl.innerHTML = `
                    <div class="ci-left">
                        <div class="ci-name">${it.name}</div>
                        <div class="ci-price">${formatPrice(it.price)}</div>
                    </div>
                    <div class="ci-right">
                        <input type="number" min="0" value="${it.qty}" data-idx="${i}" class="qty-input">
                        <button class="btn-remove" data-idx="${i}">Xóa</button>
                    </div>
                `;
                container.appendChild(itemEl);
            });
        }
        if (totalEl) totalEl.innerText = formatPrice(total);
    }

    function attachProductButtons() {
        document.querySelectorAll('.product-card').forEach(card => {
            const btn = card.querySelector('.btn-cart'); if (!btn) return;
            btn.addEventListener('click', () => {
                const name = card.querySelector('h3')?.innerText || 'Sản phẩm';
                const priceText = card.querySelector('.price')?.innerText || '0';
                const price = parsePrice(priceText);
                addToCart({ name, price });
            });
        });
    }

    // --- Search / Autocomplete ---
    let productIndex = [];
    function buildProductIndex() {
        productIndex = Array.from(document.querySelectorAll('.product-card')).map((card, idx) => {
            const name = card.querySelector('h3')?.innerText?.trim() || '';
            const priceText = card.querySelector('.price')?.innerText || '0';
            const price = parsePrice(priceText);
            const img = card.querySelector('img')?.getAttribute('src') || '';
            return { name, price, img, card, idx };
        });
    }

    function findMatches(q) {
        if (!q) return [];
        const s = q.trim().toLowerCase();
        return productIndex.filter(p => p.name.toLowerCase().includes(s));
    }

    function renderSuggestions(matches) {
        const box = document.getElementById('searchSuggestions');
        if (!box) return;
        if (!matches.length) {
            box.innerHTML = '<div class="no-results">Không tìm thấy sản phẩm.</div>';
            box.classList.add('open');
            box.setAttribute('aria-hidden','false');
            return;
        }
        box.innerHTML = matches.slice(0,8).map(m => `
            <div class="suggestion-item" data-idx="${m.idx}">
                <img src="${m.img}" alt="">
                <div class="s-info">
                    <div class="s-name">${m.name}</div>
                    <div class="s-price">${formatPrice(m.price)}</div>
                </div>
            </div>
        `).join('');
        box.classList.add('open');
        box.setAttribute('aria-hidden','false');
    }

    function clearSuggestions() {
        const box = document.getElementById('searchSuggestions');
        if (!box) return;
        box.classList.remove('open');
        box.setAttribute('aria-hidden','true');
        box.innerHTML = '';
    }

    function showResults(q) {
        const matches = findMatches(q);
        const originalGrid = document.querySelector('.product-grid');
        if (!originalGrid) return;

        // remove any existing results container
        let resultsGrid = document.getElementById('searchResultsGrid');
        if (!q) {
            // clear results view and show original grid
            if (resultsGrid) resultsGrid.remove();
            originalGrid.style.display = '';
            const msg = document.getElementById('searchResultsMsg'); if (msg) msg.remove();
            return;
        }

        // create results container if needed
        if (!resultsGrid) {
            resultsGrid = document.createElement('div');
            resultsGrid.id = 'searchResultsGrid';
            resultsGrid.className = 'product-grid';
            originalGrid.parentNode.insertBefore(resultsGrid, originalGrid.nextSibling);
        }
        // hide original grid
        originalGrid.style.display = 'none';

        // populate resultsGrid with clones of matching cards so layout matches homepage
        resultsGrid.innerHTML = '';
        matches.forEach(m => {
            const clone = m.card.cloneNode(true);
            // ensure cloned buttons add to cart correctly
            const btn = clone.querySelector('.btn-cart');
            if (btn) {
                btn.addEventListener('click', () => {
                    const name = clone.querySelector('h3')?.innerText || m.name;
                    const priceText = clone.querySelector('.price')?.innerText || m.price.toString();
                    const price = parsePrice(priceText);
                    addToCart({ name, price });
                });
            }
            resultsGrid.appendChild(clone);
        });

        // show message when no matches
        let msg = document.getElementById('searchResultsMsg');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'searchResultsMsg';
            msg.className = 'no-results';
            resultsGrid.parentNode.insertBefore(msg, resultsGrid);
        }
        if (matches.length === 0) {
            msg.innerText = 'Không tìm thấy sản phẩm cho "' + q + '".';
            msg.style.display = '';
        } else {
            msg.style.display = 'none';
        }
    }

    function setupSearch() {
        buildProductIndex();
        const input = document.getElementById('searchInput');
        const btn = document.getElementById('searchBtn');
        const box = document.getElementById('searchSuggestions');
        if (!input) return;

        input.addEventListener('input', (e)=>{
            const v = e.target.value;
            if (!v) { clearSuggestions(); showResults(''); return; }
            const matches = findMatches(v);
            renderSuggestions(matches);
        });

        input.addEventListener('keydown', (e)=>{
            if (e.key === 'Enter') {
                e.preventDefault();
                const v = input.value.trim();
                clearSuggestions();
                showResults(v);
            } else if (e.key === 'ArrowDown') {
                // focus first suggestion
                const first = document.querySelector('#searchSuggestions .suggestion-item');
                if (first) first.focus();
            }
        });

        document.addEventListener('click', (ev)=>{
            if (!document.getElementById('searchBox').contains(ev.target)) clearSuggestions();
        });

        if (box) {
            box.addEventListener('click', (ev)=>{
                const item = ev.target.closest('.suggestion-item');
                if (!item) return;
                const idx = parseInt(item.dataset.idx,10);
                const p = productIndex.find(x=>x.idx===idx);
                if (p) {
                    input.value = p.name;
                    clearSuggestions();
                    showResults(p.name);
                }
            });
        }

        if (btn) btn.addEventListener('click', ()=>{
            const v = input.value.trim();
            clearSuggestions();
            showResults(v);
        });
    }

    function setupCartPanel() {
        const cartPanel = document.getElementById('cartPanel');
        const cartIcon = document.querySelector('.cart-icon');
        const closeBtn = document.getElementById('closeCart');
        function open() { if (cartPanel) { cartPanel.classList.add('open'); cartPanel.setAttribute('aria-hidden','false'); } }
        function close() { if (cartPanel) { cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden','true'); } }
        if (cartIcon) cartIcon.addEventListener('click', () => { const isOpen = cartPanel && cartPanel.classList.contains('open'); if (isOpen) close(); else open(); updateCartUI(); });
        if (closeBtn) closeBtn.addEventListener('click', close);
        const cartItemsEl = document.getElementById('cartItems');
        if (!cartItemsEl) return;
        cartItemsEl.addEventListener('input', (e)=>{ if (e.target.classList.contains('qty-input')) { const idx = parseInt(e.target.dataset.idx,10); const val = parseInt(e.target.value,10) || 0; changeQty(idx, val); } });
        cartItemsEl.addEventListener('click', (e)=>{ if (e.target.classList.contains('btn-remove')) { const idx = parseInt(e.target.dataset.idx,10); removeFromCart(idx); } });
    }

    function setupCheckout() {
        const form = document.getElementById('checkoutForm'); if (!form) return;
        const msg = document.getElementById('orderMsg');
        form.addEventListener('submit', (e)=>{
            e.preventDefault();
            const cart = loadCart(); if (!cart.length) { if (msg) { msg.innerText = 'Giỏ hàng trống, vui lòng thêm sản phẩm.'; msg.classList.add('error'); } return; }
            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            const address = document.getElementById('custAddress').value.trim();
            const note = document.getElementById('custNote').value.trim();
            if (!name || !phone || !address) { if (msg) { msg.innerText = 'Vui lòng điền đầy đủ thông tin giao hàng.'; msg.classList.add('error'); } return; }
            const total = cart.reduce((s,i)=>s + (i.qty * i.price),0);
            const order = { id: 'ORD' + Date.now(), createdAt: new Date().toISOString(), customer: { name, phone, address, note }, items: cart, total };
            localStorage.setItem('lastOrder', JSON.stringify(order));
            saveCart([]); updateCartUI(); if (msg) { msg.classList.remove('error'); msg.innerHTML = `<strong>Đặt hàng thành công!</strong><br>Mã đơn: ${order.id}<br>Tổng: ${formatPrice(order.total)}`; msg.scrollIntoView({behavior:'smooth'}); }
        });
    }

    document.addEventListener('DOMContentLoaded', ()=>{ attachProductButtons(); setupCartPanel(); setupCheckout(); updateCartCount(); updateCartUI(); setupSearch(); });

})();
