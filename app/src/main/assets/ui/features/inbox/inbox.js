/* ===== ВХОДЯЩЕЕ «ПОДЕЛИТЬСЯ»: текст, ссылка или текстовый файл из другого приложения → новый чат с этим текстом =====
   Kotlin (share/Inbox.kt) принимает ACTION_SEND и ACTION_PROCESS_TEXT и вызывает Inbox.check().
   Мы забираем текст через мост (inboxTake, с токеном) и кладём его в поле ввода нового чата. Отправляет пользователь сам.
   Убрать модуль: удалить папку и строку в index.html. */
i18nAdd({"Сначала подключите AI-провайдера":"Connect an AI provider first","Текст из другого приложения добавлен в новый чат":"Text from another app was added to a new chat"});
const Inbox=(()=>{
 const api={};
 let ready=false,want=false;
 const run=()=>{
  let raw='';try{raw=Native.sync('inboxTake')||''}catch(e){}
  if(!raw)return;
  let d=null;try{d=JSON.parse(raw)}catch(e){}
  if(!d||!d.text)return;
  if(!S.providers.some(x=>x.ok)){toast('Сначала подключите AI-провайдера');return}
  if(Chx.busy){toast('Дождитесь ответа');return}
  $$('.spg').forEach(x=>{try{x.close?x.close():x.remove()}catch(e){}});
  const t=(d.subject&&!d.text.includes(d.subject)?d.subject+'\n':'')+d.text;
  Chx.newChat();PEND=t;
  if(CUR==='api')apiView();else show('api');
  toast('Текст из другого приложения добавлен в новый чат')};
 /* Kotlin зовёт check() и при запуске, и когда приложение уже открыто; до готовности интерфейса запрос запоминаем */
 api.check=()=>{if(ready)run();else want=true};
 Hooks.on('app:ready',()=>{ready=true;if(want){want=false;setTimeout(run,300)}});
 return api})();
