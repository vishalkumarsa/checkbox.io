var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true };
var fs = require("fs");
var _ = require("underscore");
var recursive = require("recursive-readdir");

var threshold_loc = 120;
var threshold_BigO = 3;
var threshold_syncCall = 1;
var threshold_messageChain = 3;

var buildFail = false;

function main()
{
	var args = process.argv.slice(2);

	recursive("../site", ["*.json", "*.jade", "*.html"], function (err, files) {
		

		for (file of files)
		{
			builders = {};
			complexity(file);


						// Report
			for( var node in builders )
			{
				var builder = builders[node];
				
				if(builder.messageChains > threshold_messageChain ||
					builder.loc > threshold_loc ||
					builder.syncCalls > threshold_syncCall ||
					builder.BigO > threshold_BigO ) {
						buildFail = true;
						console.log(file)
						builder.report();
					}

					
			}
		}

		
		if(buildFail)
			console.log("BUILD FAILED");
		else
			console.log("BUILD SUCCESS");
  
});

	// if( args.length == 0 )
	// {
	// 	args = ["test.js"];
	// }
	// var filePath = args[0];
	
	// complexity(filePath);

	// // Report
	// for( var node in builders )
	// {
	// 	var builder = builders[node];
	// 	builder.report();
	// }


}


var builders = {};


// Represent a reusable "class" following the Builder pattern.
function FunctionBuilder()
{
	this.StartLine = 0;
	this.FunctionName = "";
	// The number of parameters for functions
	// this.ParameterCount  = 0,
	// // Number of if statements/loops + 1
	// this.SimpleCyclomaticComplexity = 0;
	// // The max depth of scopes (nested ifs, loops, etc)
	// this.MaxNestingDepth    = 0;
	// // The max number of conditions if one decision statement.
	// this.MaxConditions      = 0;
	this.loc = 0;
	this.syncCalls = 0;
	this.messageChains = 1;
	this.BigO = 0;

	this.report = function()
	{
		console.log(
		   (
		   	"{0}(): {1}\n" +
		   	"============\n" +
			   "LinesOfCode: {2}\t" +
				"SyncCalls: {3}\t" +
				"messageChains: {4}\t" +
				"BigO: {5}\n\n"
			)
			.format(this.FunctionName, this.StartLine,
				     this.loc, this.syncCalls,
			        this.messageChains, this.BigO)
		);
	}
};

//A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;

	this.report = function()
	{
		console.log (
			( "{0}\n" +
			  "~~~~~~~~~~~~\n"+
			  "ImportCount {1}\t" +
			  "Strings {2}\n"
			).format( this.FileName, this.ImportCount, this.Strings ));
	}
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor, level)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
            	child.level = level;
					traverseWithParents(child, visitor, level + 1);
            }
        }
    }
}

function complexity(filePath)
{
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);

	var i = 0;

	// A file level-builder:
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	fileBuilder.ImportCount = 0;
	builders[filePath] = fileBuilder;

	// Tranverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{
		// if(node.type === 'ExpressionStatement'){
		// 	 	var stack = ['$'];
		// 		var empty = true;
		// 		console.log(node);
		// 		var builder = new FunctionBuilder();
		// 		builder.FunctionName = functionName(node);
		// 		builder.StartLine    = node.loc.start.line;
		// 		traverseWithParents(node, function(child){
		// 		if(child.type === 'MemberExpression' && empty)
		// 		{
		// 			builder.messageChains += 1;
		// 			//console.log(builder.messageChains)
		// 			stack.push(child);
		// 			//console.log(child);
		// 			//console.log("first");
		// 			empty = false;
		// 		}
		// 		if( (child.type === 'MemberExpression' || 
		// 			child.type === 'CallExpression' ) &&
		// 			 _.isEqual(stack[stack.length-1],child.parent) && !empty)
		// 		{	
		// 			if(child.type === 'MemberExpression'){
		// 				builder.messageChains += 1;
		// 				//console.log(builder.messageChains)
		// 				//console.log(child.id)
		// 			}
		// 			stack.push(child);
		// 			//console.log(child);

		// 			//console.log("second");
		// 		}
					
		// 	}, 1);
		// 		console.log(builder.messageChains+"$$$$$$$$");
		// 		builders[builder.FunctionName] = builder;
		// }


		if (node.type === 'FunctionDeclaration') 
		{
			//console.log(node);
			var builder = new FunctionBuilder();
			builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			// Lines Of Code
			builder.loc = node.loc.end.line - node.loc.start.line + 1;

			// Sync Call
			traverseWithParents(node, function(child){
				if(child.type === 'CallExpression' && child.callee && child.callee.property )
				{	
					//console.log(typeof(child.callee.property.name)+" lola");
					if(child.callee.property.name.includes("Sync"))
						builder.syncCalls +=1;
				}
			});
			
			// Message Chains
				
			//var msc = [];
			var max = 0;
				traverseWithParents(node, function(bchild){
					//console.log(child);
					
					
				if(bchild.type === 'ExpressionStatement'){
			 	var stack = ['$'];
				var empty = true;
				// console.log(bchild);
				var temp=1;
				var builder = new FunctionBuilder();
				builder.FunctionName = functionName(bchild);
				builder.StartLine    = bchild.loc.start.line;
				traverseWithParents(bchild, function(child){
				if(child.type === 'MemberExpression' && empty)
				{
					builder.messageChains += 1;
					temp++;
					//console.log(builder.messageChains)
					stack.push(child);
					//console.log(child);
					//console.log("first");
					empty = false;
				}
				if( (child.type === 'MemberExpression' || 
					child.type === 'CallExpression' ) &&
					 _.isEqual(stack[stack.length-1],child.parent) && !empty)
				{	
					if(child.type === 'MemberExpression'){
						builder.messageChains += 1;
						temp++;
						//console.log(builder.messageChains)
						//console.log(child.id)
					}
					stack.push(child);
					//console.log(child);

					//console.log("second");
				}
					
			}, 1);
				
				if(temp>max)
					max=temp;

				
				
		}

					
			}, 1);
					// console.log(max+"$$$$$$$$");
					builder.messageChains = max;

				// BigO
				var bigO = [];
				traverseWithParents(node, function(child){

					if(isLoop(child)){
						//console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
						bigO.push(child.level);
					}
				}, 1);
				//console.log(Lis(bigO)+"  lol");
				builder.BigO = Lis(bigO);




			builders[builder.FunctionName] = builder;

			
		}



	});

}

function Lis(bigO){
	if(bigO.length == 0)
		return 0;
var temp = new Array(bigO.length);
var i,j,max;
max = 0;

for(i = 0;i< temp.length; i++)
	temp[i] = 1;

for ( i = 1; i < bigO.length; i++ )
  for ( j = 0; j < i; j++ ) 
             if ( bigO[i] > bigO[j] && temp[i] < temp[j] + 1)
        temp[i] = temp[j] + 1;
var max = temp.reduce(function(a, b) {
    return Math.max(a, b);
});

return max;

}

// Helper function for counting children of node.
function childrenLength(node)
{
	var key, child;
	var count = 0;
	for (key in node) 
	{
		if (node.hasOwnProperty(key)) 
		{
			child = node[key];
			if (typeof child === 'object' && child !== null && key != 'parent') 
			{
				count++;
			}
		}
	}	
	return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

function isLoop(node)
{
	if( node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;

}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "anon function @" + node.loc.start.line;
}

// Helper function for allowing parameterized formatting of strings.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();

function Crazy (argument) 
{

	var date_bits = element.value.match(/^(\d{4})\-(\d{1,2})\-(\d{1,2})$/);
	var new_date = null;
	if(date_bits && date_bits.length == 4 && parseInt(date_bits[2]) > 0 && parseInt(date_bits[3]) > 0)
    new_date = new Date(parseInt(date_bits[1]), parseInt(date_bits[2]) - 1, parseInt(date_bits[3]));

    var secs = bytes / 3500;

      if ( secs < 59 )
      {
          return secs.toString().split(".")[0] + " seconds";
      }
      else if ( secs > 59 && secs < 3600 )
      {
          var mints = secs / 60;
          var remainder = parseInt(secs.toString().split(".")[0]) -
(parseInt(mints.toString().split(".")[0]) * 60);
          var szmin;
          if ( mints > 1 )
          {
              szmin = "minutes";
          }
          else
          {
              szmin = "minute";
          }
          return mints.toString().split(".")[0] + " " + szmin + " " +
remainder.toString() + " seconds";
      }
      else
      {
          var mints = secs / 60;
          var hours = mints / 60;
          var remainders = parseInt(secs.toString().split(".")[0]) -
(parseInt(mints.toString().split(".")[0]) * 60);
          var remainderm = parseInt(mints.toString().split(".")[0]) -
(parseInt(hours.toString().split(".")[0]) * 60);
          var szmin;
          if ( remainderm > 1 )
          {
              szmin = "minutes";
          }
          else
          {
              szmin = "minute";
          }
          var szhr;
          if ( remainderm > 1 )
          {
              szhr = "hours";
          }
          else
          {
              szhr = "hour";
              for ( i = 0 ; i < cfield.value.length ; i++)
				  {
				    var n = cfield.value.substr(i,1);
				    if ( n != 'a' && n != 'b' && n != 'c' && n != 'd'
				      && n != 'e' && n != 'f' && n != 'g' && n != 'h'
				      && n != 'i' && n != 'j' && n != 'k' && n != 'l'
				      && n != 'm' && n != 'n' && n != 'o' && n != 'p'
				      && n != 'q' && n != 'r' && n != 's' && n != 't'
				      && n != 'u' && n != 'v' && n != 'w' && n != 'x'
				      && n != 'y' && n != 'z'
				      && n != 'A' && n != 'B' && n != 'C' && n != 'D'
				      && n != 'E' && n != 'F' && n != 'G' && n != 'H'
				      && n != 'I' && n != 'J' && n != 'K' && n != 'L'
				      && n != 'M' && n != 'N' &&  n != 'O' && n != 'P'
				      && n != 'Q' && n != 'R' && n != 'S' && n != 'T'
				      && n != 'U' && n != 'V' && n != 'W' && n != 'X'
				      && n != 'Y' && n != 'Z'
				      && n != '0' && n != '1' && n != '2' && n != '3'
				      && n != '4' && n != '5' && n != '6' && n != '7'
				      && n != '8' && n != '9'
				      && n != '_' && n != '@' && n != '-' && n != '.' )
				    {
				      window.alert("Only Alphanumeric are allowed.\nPlease re-enter the value.");
				      cfield.value = '';
				      cfield.focus();
				    }
				    cfield.value =  cfield.value.toUpperCase();
				  }
				  return;
          }
          return hours.toString().split(".")[0] + " " + szhr + " " +
mints.toString().split(".")[0] + " " + szmin;
      }
  }
 exports.main = main;
