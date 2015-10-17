<?php
$ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://api.timezonedb.com/?key=SECRET&lat='.$_POST['lat'].'&lng='.$_POST['lon'].'&time='.$_POST['stamp'].'&format=json');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $json = curl_exec($ch);
    curl_close($ch);
   echo $json;
?>
