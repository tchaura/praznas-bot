  const seatMap = document.getElementById('seat-map');
  const bookButton = document.getElementById('book-button');
  const currentSelection = document.getElementById('current-selection');
  const closeButton = document.getElementById('close-button');
  const removeButton = document.getElementById('remove-button');
  let selectedSeats = [];
  let bookedSeats = [];
  const SEATS_BOOKING_LIMIT = 4;

  let sendData = window.Telegram.WebApp.sendData;
  
  
  
  function compareSeats(first, second) {
    return first.section == second.section && first.row == second.row && first.seat == second.seat 
}
async function generateSeatMap() {
    const seatingData = await (await fetch("/seats.json")).json();
    seatingData.sections.forEach((section, sectionIndex) => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section';
        
        section.rows = section.rows.reverse();
        section.rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            
            row.seats.forEach(seat => {
                const seatDiv = document.createElement('div');
                seatDiv.className = 'seat';
                seatDiv.dataset.row = row.row;
                seatDiv.dataset.col = seat.seat;
                seatDiv.dataset.section = section.section;
                seatDiv.dataset.absolute = (section.section - 1) * 6 + seat.seat + (section.section == 3 && row.row % 2 != 0 ? 1 : 0);
                if (seat.taken) {
                    seatDiv.classList.add('taken');
                }
                if (bookedSeats && (compareSeats(bookedSeats, seat))) {
                    seatDiv.classList.add('selected');
                }

                seatDiv.innerText = seatDiv.dataset.absolute;
                seatDiv.addEventListener('click', selectSeat);
                rowDiv.appendChild(seatDiv);
            });
            
            sectionDiv.appendChild(rowDiv);
        });
        seatMap.appendChild(sectionDiv);
    });
}

function selectSeat(event) {
    const seat = event.target;
    const seatIndex = selectedSeats.findIndex(curSeat => 
        curSeat.dataset.section == seat.dataset.section && 
        curSeat.dataset.row == seat.dataset.row && 
        curSeat.dataset.col == seat.dataset.col
    );
    
    if (seatIndex != -1) {
        seat.classList.remove('selected');
        selectedSeats.splice(seatIndex, 1);
        currentSelection.innerText = selectedSeats.length === 0 ? 
        "Выберите место" :
        currentSelection.innerText.replace(`Ряд ${seat.dataset.row}, Место ${seat.dataset.absolute}\n`, '');
        if (selectedSeats.length == 0) {
            bookButton.disabled = true;
        }
        return;
    }
    
    if (selectedSeats.length >= SEATS_BOOKING_LIMIT) {
        // Optionally, alert the user they can't select more seats
        return;
    }
    
    if (seat.classList.contains('taken')) {
        return;
    }
    
    if (selectedSeats.length === 0) currentSelection.innerText = '';
    currentSelection.innerText += `Ряд ${seat.dataset.row}, Место ${seat.dataset.absolute}\n`;
    seat.classList.add('selected');
    bookButton.disabled = false;
    selectedSeats.push(seat);
}

function bookSeats() {
    if (selectedSeats.length == 0) {
        alert('Please select a seat to book.');
        return;
    }

    selectedSeats.forEach(selectedSeat => {
        const row = selectedSeat.dataset.row;
        const col = selectedSeat.dataset.col;
        const section = selectedSeat.dataset.section;

        bookedSeats.push({row: row, col: col, section: section});
    })

    Telegram.WebApp.sendData(JSON.stringify(bookedSeats));
}

// function resetSelection(seat) {
//     seat && selectedSeats.pop(seat);
//     currentSelection.innerText = selectedSeats.length == 0 ? 
//     "Выберите место" :
//     currentSelection.innerText.replace(`Сектор ${seat.dataset.section}, Ряд ${seat.dataset.row}, Место ${seat.dataset.col}\n`, '')
//     bookButton.disabled = true
// }

bookButton.addEventListener('click', bookSeats);

generateSeatMap();