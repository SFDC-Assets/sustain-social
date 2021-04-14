import { LightningElement, track, api, wire } from 'lwc';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import chartjs from '@salesforce/resourceUrl/ChartJs';
import momentjs from '@salesforce/resourceUrl/MomentJs';

export default class PhilConnect extends LightningElement {
    @track isChartJsInitialized;
    @api recordId;
    @api objectApiName;
    fields = ['AccountId', 'Name', 'Title', 'Phone', 'Email'];
    
    chart;
    givingParticipationData = {};
    
    constructor(){
      super();
    }

    givingParticipation(data){
      const datelessArray = [];
      const dateFullArray = [];
      let outputLabelData = [];
      let outputPercentageData = [];

      data.Donation_Participation.forEach(element => {
        if(element.Donation_Date){
          dateFullArray.push(element);
        }else{
          datelessArray.push(element);
        }
      })

      const orderedDateFull = dateFullArray.sort((a, b) => {
        return moment(a.Donation_Date).diff(b.Donation_Date);
      });
      const orderedDates = orderedDateFull.concat(datelessArray);

      const calendarResolutionByDays = 7;
      for(let i = 0; i < (this.getNumWeeksForMonth(2021, 3) + this.getNumWeeksForMonth(2021, 4)); i++){
        let cumulativeParticipated = 0;
        dateFullArray.forEach(element =>{
          let isPositive = (moment(moment("2021-3-01").add(calendarResolutionByDays * i, 'days')).diff(element.Donation_Date) > 0) ? true : false;
          if(isPositive){
            if(element.Participated == "TRUE"){
              cumulativeParticipated++;
            }
          }
        });

        let outputLabel = moment("2021-3-01").add(calendarResolutionByDays * i, 'days').format('DD/MM/YY');
        let outputPercentage = cumulativeParticipated / (dateFullArray.length + datelessArray.length);
        
        outputLabelData.push(outputLabel);
        outputPercentageData.push(outputPercentage);
      }

      let configData = {
        labels: outputLabelData,
        datasets: [{
          label: "Percentage of Participants",
          backgroundColor: 'lightBlue',
          borderColor: 'royalblue',
          data: outputPercentageData
        }]
      }

      return {
        type: 'line',
        data: configData,
        options: {
          elements: {
            line: {
              tension: 0
            }
          },
          scales: {
            yAxes: [{
              display: true,
              ticks: {
                  beginAtZero: true,
                  steps: .1,
                  stepValue: .1,
                  max: 1
              }
            }]
          },
          plugins: {
            filler: {
              propagate: false,
            },
            title: {
              display: false,
              text: (ctx) => 'drawTime: ' + ctx.chart.options.plugins.filler.drawTime
            }
          },
          pointBackgroundColor: '#fff',
          radius: 0,
          interaction: {
            intersect: false,
          }
        }
      }
    }

    volunteerParticipation(data){
      console.log(data.Volunterring_Participation);   
      
      let signUpCount = 0;
      let logHoursCount = 0;
      const roundAccurately = (number, decimalPlaces) => Number(Math.round(number + "e" + decimalPlaces) + "e-" + decimalPlaces)

      data.Volunteering_Participation.forEach(element => {
        if(element.sign_up_participation == "TRUE"){
          signUpCount++;
        }
        if(element.log_hours_participation == "TRUE"){
          logHoursCount++;
        }
      });


      console.log(roundAccurately(signUpCount/data.Volunteering_Participation.length, 2), roundAccurately(logHoursCount/data.Volunteering_Participation.length, 2));


      return  `
              <div class="flex-container">
                <div class="flex-div">
                  <h5>Participation Sign Up</h5>
                </div>
                <div class="flex-div">
                  <h5>Participation with Logged Hours</h5>
                </div>
              </div>
              <div class="flex-container">
                <div class="flex-div">
                  <strong>${roundAccurately(signUpCount/data.Volunteering_Participation.length, 2)}</strong>
                </div>
                <div class="flex-div">
                  <strong>${roundAccurately(logHoursCount/data.Volunteering_Participation.length, 2)}</strong>
                </div>
              </div>
              `
    }

    giving(data, filter){
      let searchDonationDataArray = data.Donation_Data;
      let groupedDonations = [];

      function collect(arr, value){
        if(arr.length > 0){
          const collected = arr.filter(function(x) {
            return x[filter] == value;
          });
          const remainder = arr.filter(function(x) {
            return x[filter] !== value;
          });
          try{
            groupedDonations.push(collected);
            collect(remainder, remainder[0][filter]);
          }catch(error){}
        }
      }

      let calculateLabelsAndAddition = () =>{
        let labelArray = [];
        let cumulativeDonationArray = [];
        groupedDonations.forEach(element => {
          labelArray.push(element[0][filter]);
          let addition = 0;
          element.forEach(entry =>{
            addition += entry.Amount_Org;
          });
          cumulativeDonationArray.push(addition);
        });

        return {labels:labelArray, addition:cumulativeDonationArray}
      }

      collect(searchDonationDataArray, searchDonationDataArray[0][filter]);
      calculateLabelsAndAddition();

      let configData = [{
          label: "Contributions",
          backgroundColor: "#3e95cd",
          data: calculateLabelsAndAddition().addition
        }]
  
      return {
        type: 'horizontalBar',
        data: {
          barThickness: 1,
          labels: calculateLabelsAndAddition().labels,
          datasets: configData
        },
        options: {
          legend: { display: false },
          title: {
            display: true,
          },
          scales: {
            xAxes: [{
                ticks: {
                    // Include a dollar sign in the ticks
                    callback: (value, index, values) =>{
                        return '$' + this.numberWithCommas(value);
                    }
                }
            }]
        }
        }
      }
    }

    volunteer(data, filter){
      let searchDonationDataArray = data.Volunteer_Activity;
      let groupedDonations = [];

      function collect(arr, value){
        if(arr.length > 0){
          const collected = arr.filter(function(x) {
            return x[filter] == value;
          });
          const remainder = arr.filter(function(x) {
            return x[filter] !== value;
          });
          try{
            groupedDonations.push(collected);
            collect(remainder, remainder[0][filter]);
          }catch(error){}
        }
      }

      function calculateLabelsAndAddition(){
        let labelArray = [];
        let cumulativeDonationArray = [];
        groupedDonations.forEach(element => {
          labelArray.push(element[0][filter]);
          let addition = 0;
          element.forEach(entry =>{
            addition += parseInt(entry.total_hours.split(':'[0]));
          });
          cumulativeDonationArray.push(addition);
        });

        return {labels:labelArray, addition:cumulativeDonationArray}
      }

      collect(searchDonationDataArray, searchDonationDataArray[0][filter]);
      calculateLabelsAndAddition();

      let configData = [{
          label: "Hours",
          backgroundColor: "#3e95cd",
          data: calculateLabelsAndAddition().addition
        }]
  
      return {
        type: 'horizontalBar',
        data: {
          barThickness: 1,
          labels: calculateLabelsAndAddition().labels,
          datasets: configData
        },
        options: {
          legend: { display: false },
          title: {
            display: true,
          }
        }
      }
    }

    renderedCallback() {
      if (this.isChartJsInitialized) {
          return;
      }

      Promise.all([
          loadScript(this, chartjs),
          loadScript(this, momentjs)
      ]).then(() => {
      fetch('https://phil-cloud.herokuapp.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `
          query {
            Donation_Data {
              Nonprofit_Name
              Amount_Org
              Cause
              Department
              Region
              SDG
            }
            Donation_Participation {
              First_Name
              Last_Name
              Participated
              Donation_Date
            }
            Volunteering_Participation {
              first_name
              last_name
              sign_up_participation
              log_hours_participation
            }
            Volunteer_Activity{
              causes
              beneficiary_name
              total_hours
              region
              sdgs
              volunteer_firstname
              volunteer_middlename
              volunteer_lastname
              datetime_utc
              activity_description
            }
          }` 
        })
      })
      .then(res => res.json())
      .then(res => {
          this.isChartJsInitialized = true;
          console.log(res.data);
          
          this.addChart('canvas.gpChart', this.givingParticipation(res.data));
          this.addChart('canvas.gChart', this.giving(res.data, "Nonprofit_Name"));
          this.addText('div.vpText', this.volunteerParticipation(res.data));
          this.addChart('canvas.vaChart', this.volunteer(res.data, "beneficiary_name"));

          this.template.querySelector('.givingFilterGroup').addEventListener('change', (event) => {
            console.log(event.target.value);
            this.addChart('canvas.gChart', this.giving(res.data, event.target.value));
            this.chart.update();
          });

          this.template.querySelector('.volunteerFilterGroup').addEventListener('change', (event) => {
            console.log(event.target.value);
            this.addChart('canvas.vaChart', this.volunteer(res.data, event.target.value));
            this.chart.update();
          });
      });

      }).catch(error => {
        console.log("Not All good");
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error loading ChartJS',
                message: error.message,
                variant: 'error',
            }),
        );
    });
  }

  addText(textDiv, html){
    this.template.querySelector(textDiv).insertAdjacentHTML('beforeend', html);
  }

  addChart(chartCanvas, data){
    const ctx = this.template.querySelector(chartCanvas).getContext('2d');
    this.chart = new window.Chart(ctx, data);
    //this.chart.canvas.parentNode.style.height = '97%';
    //this.chart.canvas.parentNode.style.width = '97%';

    var gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, 'rgba(229, 239, 255, 1)')
    gradient.addColorStop(1, '#FFFFFF')
  }

  getNumWeeksForMonth(year,month){
    let date = new Date(year,month-1,1);
    let day = date.getDay();
    let numDaysInMonth = new Date(year, month, 0).getDate();
    return Math.ceil((numDaysInMonth + day) / 7);
  }

  arrayRemove(arr, value) { 
    return arr.filter(function(ele){ 
        return ele != value; 
    });
  }

  numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

}



/*
  dataP = {
    labels: ["Jun 2016", "Jul 2016", "Aug 2016", "Sep 2016", "Oct 2016", "Nov 2016", "Dec 2016", "Jan 2017", "Feb 2017", "Mar 2017", "Apr 2017", "May 2017"],
    // Information about the dataset
    datasets: [{
      label: "color",
      backgroundColor: 'lightblue',
      borderColor: 'royalblue',
      data: [26.4, 39.8, 66.8, 66.4, 40.6, 55.2, 77.4, 69.8, 57.8, 76, 110.8, 142.6],
  }]

  gpConfig = {
    type: 'line',
    data: this.dataP,
    options: {
      plugins: {
        filler: {
          propagate: false,
        },
        title: {
          display: true,
          text: (ctx) => 'drawTime: ' + ctx.chart.options.plugins.filler.drawTime
        }
      },
      pointBackgroundColor: '#fff',
      radius: 10,
      interaction: {
        intersect: false,
      }
    },
  }
}*/

/*
  vpConfig = {
    type: 'line',
    data: this.dataP,
    options: {
      plugins: {
        filler: {
          propagate: false,
        },
        title: {
          display: true,
          text: (ctx) => 'drawTime: ' + ctx.chart.options.plugins.filler.drawTime
        }
      },
      pointBackgroundColor: '#fff',
      radius: 10,
      interaction: {
        intersect: false,
      }
    },
  }

  vaConfig = {
    type: 'horizontalBar',
    data: {
      labels: ["entry 1", "entry 2", "entry 3", "entry 4", "entry 5"],
      datasets: [
        {
          label: "Population (millions)",
          backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"],
          data: [2478,5267,734,784,433]
        }
      ]
    },
    options: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Text by stuff'
      }
    }
  }
*/
/*
vpConfig = {
  type: 'line',
  data: this.dataP,
  options: {
    plugins: {
      filler: {
        propagate: false,
      },
      title: {
        display: true,
        text: (ctx) => 'drawTime: ' + ctx.chart.options.plugins.filler.drawTime
      }
    },
    pointBackgroundColor: '#fff',
    radius: 10,
    interaction: {
      intersect: false,
    }
  },
}

vaConfig = {
  type: 'horizontalBar',
  data: {
    labels: ["entry 1", "entry 2", "entry 3", "entry 4", "entry 5"],
    datasets: [
      {
        label: "Population (millions)",
        backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"],
        data: [2478,5267,734,784,433]
      }
    ]
  },
  options: {
    legend: { display: false },
    title: {
      display: true,
      text: 'Text by stuff'
    }
  }
}
*/