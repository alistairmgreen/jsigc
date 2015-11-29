<?php
require_once("../db_inc.php");
$mysqli=new mysqli($dbserver,$username,$password,$database);
$postdata=strtoupper($_POST['postdata']);
if(strlen($postdata)==3) {
    $stmt = $mysqli->prepare("SELECT * FROM tpoints WHERE trigraph=?");
}
else  {
     $stmt = $mysqli->prepare("SELECT * FROM worldpoints WHERE hexagraph=?");
}
 $stmt->bind_param("s", $postdata);
 $stmt->execute();
 $response=$stmt->get_result();
if($response->num_rows > 0) {
       $result= $response->fetch_assoc();
    }
else {
    $result['tpname']= "Not found";
    $result['latitude']="";
    $result['longitude']="";
}
$stmt->close();
$mysqli->close();
echo json_encode($result,JSON_NUMERIC_CHECK);
?>