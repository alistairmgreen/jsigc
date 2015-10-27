<?php
require_once("../db_inc.php");
$mysqli=new mysqli($dbserver,$username,$password,$database);
$trigraph=strtoupper(substr($_POST['trigraph'],0,3));
$sql= "SELECT tpname,latitude,longitude FROM tpoints where trigraph='".$trigraph."'";
$tpquery= $mysqli->query($sql);
if($tpquery->num_rows > 0) {
       $result= $tpquery->fetch_assoc();
    }
else {
    $result['tpname']= "Not found";
    $result['latitude']="";
    $result['longitude']="";
}
$tpquery->close();
$mysqli->close();
echo json_encode($result,JSON_NUMERIC_CHECK);
?>