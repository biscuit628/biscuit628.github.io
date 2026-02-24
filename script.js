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
    
    // 結帳功能 - 使用 Formspree.io 和 Google Sheets
    checkoutButton.addEventListener('click', async function() {
        if (cart.length === 0) {
            alert('購物車是空的！');
            return;
        }
        
        // 生成唯一訂單ID
        const orderId = 'ORD-' + Date.now();
        orderIdSpan.textContent = orderId;
        
        try {
            // 準備訂單數據
            const orderData = {
                _subject: `新訂單通知 - ${orderId}`,
                _replyto: 'customer@example.com', // 可選，如果收集客戶email
                order_id: orderId,
                order_date: new Date().toLocaleString(),
                items: cart.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: (item.price * item.quantity).toFixed(2)
                })),
                total: totalPrice.toFixed(2),
            };
            
            // 替換為您的 Formspree 表單ID
            const formspreeFormId = 'mbloepdw';
            const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxk9_yomV1modvHfJxR8044eZNs6wZnpPQbwUaXtJDlDfSOmRmYULENDVWSTjPWawNw/exec'; // 替換為您的 Google Apps Script Web App URL
            
            // 並行發送請求到 Formspree 和 Google Sheets
            const [formspreeResponse, googleSheetResponse] = await Promise.all([
                fetch(`https://formspree.io/f/${formspreeFormId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                }),
                fetch(googleAppsScriptUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderId: orderData.order_id,
                        orderDate: orderData.order_date,
                        items: orderData.items,
                        total: orderData.total
                    }),
                    mode: 'no-cors' // Google Apps Script Web App 通常需要 no-cors 模式
                })
            ]);
            
            if (formspreeResponse.ok) {
                // 顯示成功模態框
                modal.style.display = 'block';
                // 清空購物車
                cart = [];
                updateCart();
            } else {
                throw new Error('Formspree 訂單提交失敗');
            }
            
            // 注意：由於 no-cors 模式，無法檢查 googleSheetResponse 的狀態
            // Google Apps Script 應在服務器端處理錯誤並記錄
        } catch (error) {
            console.error('Error:', error);
            alert('訂單提交失敗，請稍後再試');
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