// Release-ben ne nyíljon plusz konzolablak Windowson — NE TÖRÖLD!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mytodo_lib::run()
}
