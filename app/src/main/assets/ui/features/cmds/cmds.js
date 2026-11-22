/* ===== БЫСТРЫЕ КОМАНДЫ «/» ДЛЯ ПРИЛОЖЕНИЯ =====
   /new: новый чат · /agent: включить или выключить агента-программиста · /agent-set: настройки агента ·
   /marks: закладки · /backup: резервная копия. Работают через реестр Roles.actions (список появляется, когда набираете «/»).
   Убрать модуль: удалить папку и строку в index.html. */
(()=>{
 const A=[
  {id:'a:new',cmd:'new',n:['Новый чат','New chat'],d:['Начать пустой чат','Start an empty chat'],run:()=>{if(typeof Chx!=='undefined'){Chx.newChat();if(typeof apiView==='function')apiView()}}},
  {id:'a:agent',cmd:'agent',n:['Агент-программист вкл/выкл','Coding agent on/off'],d:['Модель сама правит код и запускает проверки','The model edits code and runs checks itself'],run:()=>{if(typeof Coder==='undefined')return;Coder.toggle();toast(L(Coder.on()?'Агент включён':'Агент выключен'))}},
  {id:'a:agentset',cmd:'agent-set',n:['Настройки агента','Agent settings'],d:['Режим подтверждений, папка, лимит шагов','Approval mode, folder, step limit'],run:()=>{if(typeof Coder!=='undefined')Coder.panel()}},
  {id:'a:marks',cmd:'marks',n:['Закладки','Bookmarks'],d:['Сохранённые ответы','Saved answers'],run:()=>{if(typeof Org!=='undefined')Org.screen()}},
  {id:'a:backup',cmd:'backup',n:['Резервная копия','Backup'],d:['Сохранить или восстановить данные','Save or restore your data'],run:()=>{if(typeof SCREENS!=='undefined'&&SCREENS.backup)SCREENS.backup();else toast(L('Откройте Настройки, Резервная копия'))}}];
 i18nAdd({"Агент включён":"Agent on","Агент выключен":"Agent off","Откройте Настройки, Резервная копия":"Open Settings, Backup"});
 A.forEach(x=>{const o={};o[x.n[0]]=x.n[1];o[x.d[0]]=x.d[1];i18nAdd(o)});
 Hooks.on('app:ready',()=>{if(typeof Roles==='undefined'||!Roles.actions)return;A.forEach(x=>{if(!Roles.actions.some(y=>y.id===x.id))Roles.actions.push({id:x.id,cmd:x.cmd,kind:'action',n:x.n,d:x.d,run:x.run})})});
})();
