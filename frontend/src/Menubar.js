import React, { useEffect } from 'react';
const Menubar = () => {
    const onMenuButton = (button) => {
        console.log("clicked")
    }
    useEffect(() => {
        
    }, [])
    return (
        <div className="hzMenubar" id="menubar">
            <button className="menuitem"onClick={() => { onMenuButton(0) }}>List</button>
            <button className="menuitem"onClick={() => { onMenuButton(1) }}>Stats Viewer</button>
            <button className="menuitem"onClick={() => { onMenuButton(2) }}>Submit</button>
            <a href="https://discord.gg/rgcqpXHgkc" className='menuitem'>Join Discord</a>
        </div>
    )
}
export default Menubar;