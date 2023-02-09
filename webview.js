module.exports = (Ferdium, settings) => {
  const path = require('path');

  const getTickets = () => {
    let rows = document.querySelectorAll("table.list.queue.tickets tbody tr");
    let tickets = [];

    rows.forEach(row => {
      let id = row.querySelector('td:nth-child(2) a.preview').innerHTML;
      let conversations = 0;
      let conversationSpan = row.querySelector('td:nth-child(4) span.pull-right');
      if (conversationSpan) {
        conversations = conversationSpan.querySelector('small').innerText;
      }

      tickets.push({
        id: id,
        conversations: conversations,
        row: row
      });
    });

    tickets.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      }

      if (a.id > b.id) {
        return 1;
      }

      return 0;
    });

    return tickets;
  };

  const changeTicketColor = (ticket, color) => {
    ticket
        .row
        // Get all td for ticket row
        .querySelectorAll('td')
        // Set background color for each td
        .forEach(td => td
            .style
            .backgroundColor = color
        );
  };

  const notify = (message) => {
    new Notification(settings.recipe.name, {
      body: message,
    });
  };

  let globalTickets = getTickets();
  let resetGlobalTickets = false;

  const getChangesCount = () => {
    const currentTickets = getTickets();
    let changesCount = 0;

    if (resetGlobalTickets) {
      globalTickets = currentTickets;

      resetGlobalTickets = false;
      return changesCount;
    }

    // Remove tickets not existing anymore from global
    globalTickets = globalTickets
        .filter(gt => currentTickets
            .map(t => t.id)
            .includes(gt.id)
        );

    if (JSON.stringify(globalTickets) !== JSON.stringify(currentTickets)) {
      const globalTicketIds = globalTickets
          .map(st => st.id);

      const newTickets = currentTickets
          .filter(t => !globalTicketIds
              .includes(t.id)
          );

      if (newTickets.length) {
        // There are new tickets
        changesCount += newTickets.length;

        notify(`New tickets: ${newTickets.length}`);

        newTickets.forEach(t => changeTicketColor(t, '#66FF99'));
      }

      const newConversationTickets = currentTickets
          // Only use tickets already in global
          .filter(t => globalTicketIds
              .includes(t.id)
          )
          // Only have the ones which have more conversations than in global
          .filter(t => t.conversations > globalTickets.find(gt => gt.id === t.id).conversations)

      if (newConversationTickets.length) {
        // There are tickets with new conversations
        changesCount += newConversationTickets.length;

        notify(`Tickets with new conversations: ${newConversationTickets.length}`);

        newConversationTickets.forEach(t => changeTicketColor(t, '#8BCBE0'))
      }
    }

    return changesCount;
  };

  const isOpenTicketsQueueOpen = () => {
    if (location.pathname !== '/scp/tickets.php') {
      // Wrong pathname
      return false;
    }

    const urlSearchParams = new URLSearchParams(location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const paramsKeys = Object.keys(params);

    return !paramsKeys.length // No params
        || (paramsKeys.includes('queue') && params.queue === '1');
  }

  const runLoop = () => {
    let changesCount = 0;

    if (isOpenTicketsQueueOpen()) {
      changesCount = getChangesCount();
    } else {
      resetGlobalTickets = true;
    }

    Ferdium.setBadge(changesCount);
  };

  Ferdium.loop(runLoop);
  Ferdium.injectCSS(path.join(__dirname, 'style.css'));
};
