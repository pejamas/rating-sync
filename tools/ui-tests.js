if (location.search.includes('test=ordering')) setTimeout(function() {
    var checks = 0;
    function assert(value, name) { if (!value) throw Error(name); checks++; }
    try {
        var progress = {UpdatedItems:3,ProcessedItems:3,TotalItems:3,UpdatedDetails:{'42':'A\u001eChange A','9':'B\u001eChange B','101':'C\u001eChange C'},UpdatedOrder:['42','9','101'],Changes:{}};
        ['42','9','101'].forEach(id => progress.Changes[id]=[{Rating:'IMDb',Before:7,After:8,Source:'OMDb'}]);
        page.updateProgressUI(view,progress,false);
        var list = view.querySelector('#updatedList');
        function order() { return Array.from(list.querySelectorAll('[data-item-key]')).map(e=>e.dataset.itemKey).filter(k=>k!=='__header').join(','); }
        assert(order()==='101,9,42','Newest completion first, independent of ID');
        var row=list.querySelector('[data-item-key="101"]'); row.querySelector('details').open=true;
        page.updateProgressUI(view,progress,false);
        assert(list.querySelector('[data-item-key="101"]')===row,'Unchanged row retained');
        assert(row.querySelector('details').open,'Open details retained');
        progress.UpdatedDetails['2']='D\u001eChange D';progress.UpdatedOrder.push('2');progress.UpdatedItems=4;
        page.updateProgressUI(view,progress,false);
        assert(order()==='2,101,9,42','New result prepended in completion order');
        assert(row.querySelector('details').open,'Details stay open after prepending');
        for(var i=200;i<240;i++){progress.UpdatedDetails[i]='Item '+i+'\u001eChanged';progress.UpdatedOrder.push(String(i));}
        page.updateProgressUI(view,progress,false);
        var scroll=list.parentElement;scroll.scrollTop=250;
        var anchor=Array.from(list.children).find(e=>e.getBoundingClientRect().bottom>scroll.getBoundingClientRect().top);
        var top=anchor.getBoundingClientRect().top;
        progress.UpdatedDetails['1']='Newest\u001eChanged';progress.UpdatedOrder.push('1');
        page.updateProgressUI(view,progress,false);
        assert(Math.abs(anchor.getBoundingClientRect().top-top)<2,'Scrolled reader position preserved');
        var before=order();page.updateProgressUI(view,{ProcessedItems:100},true);
        assert(order()===before,'Lightweight poll leaves result rows intact');
        var output=document.createElement('p');output.id='uiTestResult';output.textContent='PASS: '+checks+' live-update checks';document.body.prepend(output);
    } catch(error) { var output=document.createElement('p');output.id='uiTestResult';output.textContent='FAIL: '+error.message;document.body.prepend(output); }
}, 0);
