"use strict";
const byId = id => document.getElementById(id);

async function api(path, options = {}) {
    const res = await fetch(path, { credentials: "same-origin", ...options });
    if (!res.ok) throw new Error((await res.text()).trim() || `HTTP ${res.status}`);
    return res.json();
}

function formatPayment(status) {
    if (status === "paid") return "決済済み";
    if (status === "refunded") return "返金済み";
    if (status === "refund_failed") return "返金失敗";
    return "未決済";
}

async function load() {
    const orders = await api("/api/admin/shipments");
    const tbody = byId("shipments");
    tbody.replaceChildren();
    for (const order of orders) {
        const tr = document.createElement("tr");
        for (const value of [
            order.id,
            order.product_name,
            order.quantity,
            order.created_at,
            formatPayment(order.payment_status),
            order.shipping_status
        ]) {
            const td = document.createElement("td");
            td.textContent = String(value);
            tr.appendChild(td);
        }
        const td = document.createElement("td");
        if (order.payment_status === "paid" && order.shipping_status === "受付") {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "発送済みにする";
            btn.addEventListener("click", async () => {
                if (!confirm(`注文 ${order.id} を発送済みにしますか？`)) return;
                btn.disabled = true;
                try {
                    await api("/api/admin/shipments/dispatch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_id: order.id })
                    });
                    await load();
                    byId("message").textContent = "発送状態を更新しました。";
                } catch (e) {
                    byId("message").textContent = e.message;
                    await load().catch(() => {});
                }
            });
            td.appendChild(btn);
        } else if (order.shipping_status === "返品申請中") {
            const approveBtn = document.createElement("button");
            approveBtn.type = "button";
            approveBtn.textContent = "返品承認・返金";

            const rejectBtn = document.createElement("button");
            rejectBtn.type = "button";
            rejectBtn.textContent = "返品却下";

            const failBtn = document.createElement("button");
            failBtn.type = "button";
            failBtn.textContent = "返金失敗記録";

            const disableAll = () => {
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
                failBtn.disabled = true;
            };

            approveBtn.addEventListener("click", async () => {
                if (!confirm(`注文 ${order.id} の返品を承認し、在庫戻しと模擬返金を行いますか？`)) return;
                disableAll();
                try {
                    await api("/api/admin/returns/approve", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_id: order.id })
                    });
                    await load();
                    byId("message").textContent = "返品を承認し、在庫戻しと模擬返金を完了しました。";
                } catch (e) {
                    byId("message").textContent = e.message;
                    await load().catch(() => {});
                }
            });

            rejectBtn.addEventListener("click", async () => {
                if (!confirm(`注文 ${order.id} の返品申請を却下しますか？（在庫・決済は変更されません）`)) return;
                disableAll();
                try {
                    await api("/api/admin/returns/reject", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_id: order.id })
                    });
                    await load();
                    byId("message").textContent = "返品申請を却下（返品却下）しました。";
                } catch (e) {
                    byId("message").textContent = e.message;
                    await load().catch(() => {});
                }
            });

            failBtn.addEventListener("click", async () => {
                if (!confirm(`注文 ${order.id} に返金失敗（refund_failed）を記録しますか？`)) return;
                disableAll();
                try {
                    await api("/api/admin/returns/refund-fail", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ order_id: order.id })
                    });
                    await load();
                    byId("message").textContent = "返金失敗（refund_failed）を記録しました。";
                } catch (e) {
                    byId("message").textContent = e.message;
                    await load().catch(() => {});
                }
            });

            td.appendChild(approveBtn);
            td.append(" ");
            td.appendChild(rejectBtn);
            td.append(" ");
            td.appendChild(failBtn);
        } else {
            td.textContent = "－";
        }
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

async function init() {
    try {
        const me = await api("/api/me");
        if (!me.is_admin) throw new Error("管理者権限がありません");
        byId("panel").hidden = false;
        byId("message").textContent = `管理者：${me.username}`;
        await load();
    } catch (e) {
        byId("message").textContent = e.message;
    }
}

byId("reload").addEventListener("click", () => load().catch(e => byId("message").textContent = e.message));
init();