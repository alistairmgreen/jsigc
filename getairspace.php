<?php
require_once("../db_inc.php");
echo "{\n\"polygons\": [\n{\n";
$mysqli=new mysqli($dbserver,$username,$password,$database);
$whereclause= "northlim  > ".floatval($_POST['minNorth'])." AND  southlim < ".floatval($_POST['maxNorth'])." AND  eastlim > ".floatval($_POST['minEast'])." AND westlim < ".floatval($_POST['maxEast']);
$sql= "SELECT polynum,base, point, coords FROM polyref INNER JOIN polypoints ON polyref.polynum=polypoints.polygon WHERE $whereclause ORDER BY polynum,point";
$polygons=$mysqli->query($sql);
$counter=0;
while($polypoint=$polygons->fetch_assoc()) {
   if($polypoint['polynum'] !== $counter) {
       if($counter > 0) {
            echo "]\n},\n{\n";
             }
          echo "\"base\": ".$polypoint['base'].",\n\"coords\": [";
          $counter=$polypoint['polynum'];
        }
        else {
           echo ",";
            }
        echo $polypoint['coords'];
   }
echo "]\n}\n],\n";
echo "\"circles\": [\n";
 $sql2= "SELECT circlenum,base, centre, radius FROM circles WHERE $whereclause"; 
 $circlelist=$mysqli->query($sql2);
 $started=false;
 while($circle=$circlelist->fetch_assoc()) {
   if($started) {
      echo ",\n";
      }
  $started=true;
   echo "{\n\"base\":".$circle['base'].",\n";
   echo "\"centre\":".$circle['centre'].",\n";
   echo "\"radius\":".$circle['radius']."\n}";
 }
//echo $sql;
$mysqli->close();
echo "\n]\n}\n";
?>
