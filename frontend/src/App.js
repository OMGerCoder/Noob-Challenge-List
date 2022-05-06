import React, { useState } from 'react';
import './main.css'
import Menubar from './Menubar'
const App = async() => {
    const [loginText, setLoginText] = useState("Login")
    await fetch("https://noobchallengelist.com")
    return <Menubar />
}
export default App;