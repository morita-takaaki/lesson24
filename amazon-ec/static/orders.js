"use strict";

function formatPaymentStatus(status) {
    if (status === "paid") return "決済済み";
    if (status === "refunded") return "返金済み";
    if (status === "refund_failed") return "返金失敗";
    return "未決済";
}

async function loadOrders() {
    const tbody = document.getElementById("order-items");
    try {
        const me = await fetch("/api/me");
        if (!me.ok) {
            tbody.innerHTML = '<tr><td colspan="8">自分の注文履歴を見るにはログインしてください。<a href="login.html">ログイン</a></td></tr>';
            return;
        }
        const response = await fetch("/api/orders");
        if (!response.ok) throw new Error("注文履歴の取得に失敗しました。");
        const orders = await response.json();
        tbody.textContent = "";
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="8">自分の注文履歴はありません。</td></tr>';
            return;
        }
        for (const item of orders) {
            const row = document.createElement("tr");
            const values = [
                String(item.id),
                item.product_name,
                `¥${item.price.toLocaleString()}`,
                String(item.quantity),
                `¥${(item.price * item.quantity).toLocaleString()}`,
                formatPaymentStatus(item.payment_status),
                item.shipping_status
            ];
            for (const value of values) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            const actionCell = document.createElement("td");
            if (item.shipping_status === "受付") {
                if (item.payment_status === "unpaid") {
                    const payBtn = document.createElement("button");
                    payBtn.type = "button";
                    payBtn.textContent = "決済する";
                    payBtn.addEventListener("click", () => {
                        window.location.href = `payment.html?orders=${item.id}`;
                    });
                    actionCell.appendChild(payBtn);
                    actionCell.append(" ");
                }

                const cancelBtn = document.createElement("button");
                cancelBtn.type = "button";
                cancelBtn.textContent = "キャンセル";
                cancelBtn.addEventListener("click", () => handleOrderAction(
                    "/api/orders/cancel",
                    item.id,
                    `注文ID ${item.id} をキャンセルしますか？`,
                    cancelBtn
                ));
                actionCell.appendChild(cancelBtn);
            } else if (item.shipping_status === "発送済み" && item.payment_status === "paid") {
                const returnBtn = document.createElement("button");
                returnBtn.type = "button";
                returnBtn.textContent = "返品申請";
                returnBtn.addEventListener("click", () => handleOrderAction(
                    "/api/orders/return",
                    item.id,
                    `注文ID ${item.id} の返品を申請しますか？`,
                    returnBtn
                ));
                actionCell.appendChild(returnBtn);
            } else {
                actionCell.textContent = "－";
            }
            row.appendChild(actionCell);
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8">注文履歴の取得に失敗しました。</td></tr>';
    }
}

async function handleOrderAction(endpoint, orderId, confirmMsg, button) {
    if (!confirm(confirmMsg)) return;
    button.disabled = true;
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId })
        });
        if (!res.ok) {
            throw new Error((await res.text()).trim() || "操作に失敗しました。");
        }
        const data = await res.json();
        alert(data.message || "処理が完了しました。");
        await loadOrders();
    } catch (err) {
        alert(err.message);
        await loadOrders();
    }
}

document.addEventListener("DOMContentLoaded", loadOrders);