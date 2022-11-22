
const template = `  
<el-card class="box-card" shadow="hover">
    <p class="title">{{this.weather.day}}</p>
    <i v-bind:class="this.icon" size="6x"></i>
    <p class="avg">Avg.</p>
    <p class="temp">{{this.weather.temp + "°C"}}</p>
    <p class="weather">{{this.weather.weather}}</p>
    <p class="hi-lo">{{"H: " + this.weather.temp_max +"°C" + "  L: " + this.weather.temp_min+"°C"}}</p>
    <el-collapse class="details" v-model="activeNames" @change="handleChange">
    <el-collapse-item title="Details" name="1">
        <el-descriptions column="1" border>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <p class="desc-cell">Rain</p>
                        <i class="fa-solid fa-cloud-rain"></i>
                    </div>
                </template>
                {{this.weather.rain_pop+ " %"}}
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <p class="desc-cell">Rainfall</p>
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                </template>
                {{this.weather.rainfall + " mm"}}
            </el-descriptions-item>
            <el-descriptions-item>
                <template #label>
                    <div class="cell-item">
                        <p class="desc-cell">Wind</p>
                        <i class="fa-solid fa-wind"></i>
                    </div>
                </template>
                {{this.weather.wind + " m/s"}}
            </el-descriptions-item>
        </el-descriptions>
    </el-collapse-item>
    </el-collapse>
</el-card>
`

const DayWeather = {
    props:{
        weatherData:{
            type: Object
        }
    }
    ,
    data() {
        return {
            weather: {
                date: this.weatherData.date, 
                day: this.weatherData.day,
                temp: this.weatherData.temp,
                temp_max : this.weatherData.temp_max, 
                temp_min : this.weatherData.temp_min, 
                humidity: this.weatherData.humidity,
                rainfall: this.weatherData.rainfall, 
                rain_pop: this.weatherData.rain_pop,
                wind: this.weatherData.wind,
                weather: this.weatherData.weather
            },
            icon: this.getWeather(this.weatherData.weather)
        }
      },
      methods:{
        getWeather(weather){
            console.log(weather)
            if(weather=="Rain") return "fa-solid fa-cloud-showers-heavy fa-6x"
            else if(weather=="Drizzle") return "fa-solid fa-cloud-rain fa-6x"
            else if(weather=="Thunderstorm") return "fa-solid fa-cloud-bolt fa-6x"
            else if(weather=="Snow") return "fa-regular fa-snowflake fa-6x"
            else if(weather=="Atomsphere") return "fa-solid fa-smog fa-6x"
            else if(weather=="Clouds") return "fa-solid fa-cloud fa-6x"
            else if(weather=="Clear") return "fa-solid fa-sun fa-6x"
        }
      },
      template: template
}
