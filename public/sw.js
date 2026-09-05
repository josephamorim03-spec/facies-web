self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "KrosMed", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

/**
 * Só caminho interno sai daqui.
 *
 * O destino vem do PAYLOAD do push, e `clients.openWindow` abre o que receber —
 * inclusive outro domínio. Explorar isso exige a chave VAPID privada, ou seja,
 * já ter o servidor; é endurecimento, não brecha aberta. Mas a checagem custa
 * uma linha e fecha o caso em que um payload malformado leva o aluno para fora.
 *
 * `//` é recusado junto com o resto: começa com barra e mesmo assim é
 * protocol-relative — o navegador o resolve como outro host. É o mesmo caso que
 * `destinoInternoSeguro` fecha no `?next=` do login.
 */
function caminhoInterno(valor) {
  const bruto = String(valor ?? "").trim();
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return "/";
  return bruto;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = caminhoInterno(event.notification.data?.url);
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
