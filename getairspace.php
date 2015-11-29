<?php
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST');
require_once("../db_inc.php");
$countries=[];
echo "{\n\"polygons\": [\n";
$mysqli=new mysqli($dbserver,$username,$password,$database);
$whereclause= "northlim  > ".floatval($_POST['minNorth'])." AND  southlim < ".floatval($_POST['maxNorth'])." AND  eastlim > ".floatval($_POST['minEast'])." AND westlim < ".floatval($_POST['maxEast']);
//$whereclause= "northlim  >  55  AND  southlim < 58 AND  eastlim >-5  AND westlim < 0";
$sql= "SELECT polynum,country,base, point, coords FROM polyref INNER JOIN polypoints ON polyref.polynum=polypoints.polygon WHERE $whereclause ORDER BY polynum,point";
$polygons=$mysqli->query($sql);
$counter=0;
if($polygons->num_rows !==0) {
 echo "{\n";
while($polypoint=$polygons->fetch_assoc()) {
    if($polypoint['polynum'] !== $counter) {
      $countries[]= $polypoint['country'];
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
echo "]\n}\n";
}
$polygons->close();
echo "],\n";
echo "\"circles\": [\n";
 $sql2= "SELECT circlenum,country,base, centre, radius FROM circles WHERE $whereclause"; 
 $circlelist=$mysqli->query($sql2);
 $started=false;
 while($circle=$circlelist->fetch_assoc()) {
   $countries[]= $circle['country'];
   if($started) {
      echo ",\n";
      }
  $started=true;
   echo "{\n\"base\":".$circle['base'].",\n";
   echo "\"centre\":".$circle['centre'].",\n";
   echo "\"radius\":".$circle['radius']."\n}";
 }
 $circlelist->close();
 $countrylist=array_unique($countries);
if(count($countrylist) > 0) {
 $inlist= "";
 $i=0;
foreach($countrylist as $country) {
   if($i >0)  {
     $inlist.= ",";
     }
     $i++;
     $inlist.="\"$country\"";
}
$countrysql="SELECT source, date_format(updated,'%b %Y') AS showdate FROM countries WHERE country IN($inlist)";
$countryset=$mysqli->query($countrysql);
if($countryset->num_rows ===0)  {
     $textout= "<br>None available for this region";
     }
else  {
     $textout="";
     while($countrylist=$countryset->fetch_assoc()) {
            $textout.="<br><a href='http://".$countrylist['source']."'>".$countrylist['source']."</a> updated ".$countrylist['showdate'];
        }
  }
$countryset->close();
   }
else  {
  $textout= "<br>Not available for this region";
}
$mysqli->close();
echo "],\n\"country\": \"$textout\"\n";
echo "\n}\n";
?>
