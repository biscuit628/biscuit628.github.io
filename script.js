document.addEventListener('DOMContentLoaded', function() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.getElementById('cart-count');
    const totalPriceElement = document.getElementById('total-price');
    const checkoutButton = document.getElementById('checkout');
    const modal = document.getElementById('success-modal');
    const closeBtn = document.querySelector('.close');
    const orderIdSpan = document.getElementById('order-id');
    
    let cart = [];
    let totalPrice = 0;
    
    // 加入購物車功能
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productElement = this.closest('.product');
            const productId = productElement.getAttribute('data-id');
            const productName = productElement.querySelector('h3').textContent;
            const productPrice = parseFloat(productElement.getAttribute('data-price'));
            const productImage = productElement.querySelector('img').src;
            
            const existingItem = cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: 1
                });
            }
            
            updateCart();
        });
    });
    
    // 更新購物車顯示
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        totalPrice = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalPrice += itemTotal;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" width="50">
                <div>
                    <p>${item.name}</p>
                    <p>$${item.price} x ${item.quantity}</p>
                </div>
                <button class="remove-item" data-id="${item.id}">×</button>
            `;
            
            cartItemsContainer.appendChild(cartItemElement);
        });
        
        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        totalPriceElement.textContent = totalPrice.toFixed(2);
        
        // 綁定移除按鈕（每次更新都重新綁定）
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                removeFromCart(itemId);
            });
        });
    }
    
    // 從購物車移除商品
    function removeFromCart(itemId) {
        cart = cart.filter(item => item.id !== itemId);
        updateCart();
    }
    
    // 結帳功能 - 使用 Formspree (改用 urlencoded) + Google Sheets
    checkoutButton.addEventListener('click', async function() {
        if (cart.length === 0) {
            alert('購物車是空的！');
            return;
        }
        
        // 生成唯一訂單ID
        const orderId = 'ORD-' + Date.now();
        orderIdSpan.textContent = orderId;
        
        try {
            // 準備 Formspree 用的表單資料 (urlencoded)
            const formData = new URLSearchParams();
            formData.append('_subject', `新訂單通知 - ${orderId}`);
            formData.append('order_id', orderId);
            formData.append('order_date', new Date().toLocaleString('zh-TW'));
            formData.append('total', totalPrice.toFixed(2));
            
            // 商品明細（用 indexed 方式，Formspree 會自動展開）
            cart.forEach((item, index) => {
                formData.append(`items[${index}][name]`, item.name);
                formData.append(`items[${index}][price]`, item.price.toFixed(2));
                formData.append(`items[${index}][quantity]`, item.quantity);
                formData.append(`items[${index}][subtotal]`, (item.price * item.quantity).toFixed(2));
            });
            
            // 如果未來想收集客戶 email，可加這行（目前先註解）
            // formData.append('_replyto', 'customer@example.com');
            
            // 你的 Formspree 表單 ID
            const formspreeFormId = 'mbloepdw';  // ← 確認這是你真正的 ID
            
            // 你的 Google Apps Script Web App URL
            const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxk9_yomV1modvHfJxR8044eZNs6wZnpPQbwUaXtJDlDfSOmRmYULENDVWSTjPWawNw/exec';
            
            // 並行發送
            const [formspreeResponse, googleSheetResponse] = await Promise.all([
                // Formspree - 用 urlencoded 發送
                fetch(`https://formspree.io/f/${formspreeFormId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json'  // 希望得到 JSON 回應方便判斷
                    },
                    body: formData
                }),
                
                // Google Apps Script (保持 no-cors，無法讀取回應)
                fetch(googleAppsScriptUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId: orderId,
                        orderDate: new Date().toLocaleString('zh-TW'),
                        items: cart.map(item => ({
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            subtotal: (item.price * item.quantity).toFixed(2)
                        })),
                        total: totalPrice.toFixed(2)
                    }),
                    mode: 'no-cors'
                })
            ]);
            
            if (formspreeResponse.ok) {
                console.log('Formspree 提交成功');
                // 顯示成功模態框
                modal.style.display = 'block';
                // 清空購物車
                cart = [];
                updateCart();
            } else {
                const errorData = await formspreeResponse.json().catch(() => ({}));
                console.error('Formspree 失敗:', formspreeResponse.status, errorData);
                alert(`訂單提交失敗（Formspree 錯誤：${formspreeResponse.status}）`);
            }
            
            // Google Apps Script 因 no-cors 無法確認，但通常成功率高
            console.log('Google Apps Script 已發送（no-cors 模式，無法確認狀態）');
            
        } catch (error) {
            console.error('結帳過程發生錯誤:', error);
            alert('訂單提交失敗，請檢查網路或稍後再試');
        }
    });
    
    // 關閉模態框
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // 點擊模態框外部關閉
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
