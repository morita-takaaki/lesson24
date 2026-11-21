document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
});

function fetchProducts() {
    fetch("/api/products")
        .then(response => response.json())
        .then(products => {
            const listDiv = document.getElementById("product-list");
            listDiv.innerHTML = "";
            if (products.length === 0) {
                listDiv.innerHTML = "<p>商品がありません。</p>";
                return;
            }
            products.forEach(product => {
                const card = document.createElement("div");
                card.className = "product-card";
                const outOfStock = product.stock <= 0;
                card.innerHTML = `
                    ${product.image_url ? `<img class="product-image" src="${product.image_url}" alt="商品画像">` : ""}
                    <div class="product-title">
                        <a href="detail.html?id=${product.id}">${escapeHtml(product.name)}</a>
                    </div>
                    <div class="price">¥${product.price.toLocaleString()}</div>
                    <div class="stock">在庫: ${product.stock}個</div>
                    <div class="order-form">
                        <label for="qty-${product.id}">数量:</label>
                        <input type="number" id="qty-${product.id}" value="1" min="1" max="${product.stock}" style="width: 50px;" ${outOfStock ? "disabled" : ""}>
                        <button onclick="orderProduct(${product.id})" ${outOfStock ? "disabled" : ""}>${outOfStock ? "在庫切れ" : "注文する"}</button>
                    </div>
                `;
                listDiv.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Error fetching products:", error);
            document.getElementById("product-list").innerText = "商品の取得に失敗しました。";
        });
}

function orderProduct(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyInput.value, 10);
    if (isNaN(quantity) || quantity <= 0) {
        alert("正当な数量を入力してください。");
        return;
    }
    const payload = {
        product_id: productId,
        quantity: quantity
    };
    fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(async response => {
        if (!response.ok) {
            const msg = (await response.text()).trim();
            throw new Error(msg || "注文処理に失敗しました。");
        }
        return response.json();
    })
    .then(data => {
        if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("注文IDを取得できませんでした。");
        window.location.href = `payment.html?orders=${data.id}`;
    })
    .catch(error => {
        console.error("Error creating order:", error);
        alert(error.message);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}